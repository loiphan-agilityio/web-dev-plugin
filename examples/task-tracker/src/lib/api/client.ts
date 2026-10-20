import { Context, Effect, flow, Layer, Schema } from 'effect';
import {
  FetchHttpClient,
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from 'effect/http';

import { config } from '@/lib/config';

import {
  type ApiError,
  ForbiddenError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  ServerError,
  UnauthorizedError,
  ValidationError,
} from './errors';

/** Body the API sends with a 400/422: a message and optional per-field messages. */
const ValidationBody = Schema.Struct({
  message: Schema.optional(Schema.String),
  errors: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

const fromStatus = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<never, ApiError> => {
  switch (response.status) {
    case 401:
      return Effect.fail(new UnauthorizedError());
    case 403:
      return Effect.fail(new ForbiddenError());
    case 404:
      return Effect.fail(new NotFoundError());
    case 400:
    case 422:
      return response.json.pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(ValidationBody)),
        // A malformed error body still means "invalid input", just without field details.
        Effect.catch(() => Effect.succeed({ message: undefined, errors: undefined })),
        Effect.flatMap((body) =>
          Effect.fail(
            new ValidationError({
              message: body.message ?? 'Please check the highlighted fields.',
              fields: body.errors ?? {},
            }),
          ),
        ),
      );
    default:
      return Effect.fail(new ServerError({ status: response.status }));
  }
};

/** Maps Effect's transport-level errors onto the app's `ApiError` union. */
const toApiError = (
  error: HttpClientError.HttpClientError | Schema.SchemaError,
): Effect.Effect<never, ApiError> => {
  if (error._tag === 'SchemaError') {
    return Effect.fail(new InvalidResponseError({ message: error.message }));
  }
  switch (error.reason._tag) {
    case 'StatusCodeError':
      return fromStatus(error.reason.response);
    case 'DecodeError':
    case 'EmptyBodyError':
      return Effect.fail(new InvalidResponseError({ message: error.message }));
    case 'TransportError':
    case 'EncodeError':
    case 'InvalidUrlError':
      return Effect.fail(new NetworkError());
  }
};

/**
 * The only way the app talks to the backend. Every method decodes the response with the
 * schema you pass and fails with an `ApiError`, so callers never see raw HTTP errors.
 *
 * Retries are owned by TanStack Query (see query-client.ts); do not add
 * `HttpClient.retryTransient` here or every retry multiplies.
 */
export class ApiClient extends Context.Service<
  ApiClient,
  {
    readonly get: <S extends Schema.Constraint>(
      path: string,
      schema: S,
      options?: { readonly urlParams?: Record<string, string> },
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly post: <S extends Schema.Constraint>(
      path: string,
      body: unknown,
      schema: S,
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly put: <S extends Schema.Constraint>(
      path: string,
      body: unknown,
      schema: S,
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly patch: <S extends Schema.Constraint>(
      path: string,
      body: unknown,
      schema: S,
    ) => Effect.Effect<S['Type'], ApiError, S['DecodingServices']>;
    readonly delete: (path: string) => Effect.Effect<void, ApiError>;
  }
>()('app/lib/api/ApiClient') {
  static readonly layer = Layer.effect(
    ApiClient,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(
          flow(
            HttpClientRequest.prependUrl(config.apiUrl),
            HttpClientRequest.acceptJson,
            // Auth goes here when the app has it, e.g. HttpClientRequest.bearerToken(token).
          ),
        ),
        HttpClient.filterStatusOk,
      );

      const send = <S extends Schema.Constraint>(
        request: HttpClientRequest.HttpClientRequest,
        schema: S,
      ) =>
        client
          .execute(request)
          .pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
            Effect.catch(toApiError),
          );

      return ApiClient.of({
        get: (path, schema, options) =>
          send(HttpClientRequest.get(path, { urlParams: options?.urlParams ?? {} }), schema),
        post: (path, body, schema) =>
          send(HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)), schema),
        put: (path, body, schema) =>
          send(HttpClientRequest.put(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)), schema),
        patch: (path, body, schema) =>
          send(HttpClientRequest.patch(path).pipe(HttpClientRequest.bodyJsonUnsafe(body)), schema),
        delete: (path) =>
          client
            .execute(HttpClientRequest.delete(path))
            .pipe(Effect.asVoid, Effect.catch(toApiError)),
      });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
}
