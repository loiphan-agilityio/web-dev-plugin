import { Schema } from 'effect';

/** The request never got a response: offline, DNS failure, CORS, connection reset. */
export class NetworkError extends Schema.TaggedError<NetworkError>()('NetworkError', {}) {}

/** 401 — the user is not signed in, or the session expired. */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {},
) {}

/** 403 — signed in, but not allowed to do this. */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()('ForbiddenError', {}) {}

/** 404 — the resource does not exist (or the user may not know it exists). */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()('NotFoundError', {}) {}

/** 409 — the request is valid but clashes with the current state (e.g. deleting a book on loan). */
export class ConflictError extends Schema.TaggedError<ConflictError>()('ConflictError', {
  message: Schema.String,
}) {}

/**
 * 400/422 — the server rejected the input. `fields` maps a field name to its message, so a
 * form can hand each one to `setError` and show it next to the right input.
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()('ValidationError', {
  message: Schema.String,
  fields: Schema.Record(Schema.String, Schema.String),
}) {}

/** Any other non-2xx response. */
export class ServerError extends Schema.TaggedError<ServerError>()('ServerError', {
  status: Schema.Number,
}) {}

/**
 * A 2xx response whose body does not match the schema: the API contract drifted. This is a
 * bug to report, not something the user can fix, so it is never shown as "no results".
 */
export class InvalidResponseError extends Schema.TaggedError<InvalidResponseError>()(
  'InvalidResponseError',
  { message: Schema.String },
) {}

/** Every way an API call can fail. This is also TanStack Query's `error` type (see query-client.ts). */
export type ApiError =
  | NetworkError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | ConflictError
  | ValidationError
  | ServerError
  | InvalidResponseError;

/** The message to show a user for an API failure. */
export const toUserMessage = (error: ApiError): string => {
  switch (error._tag) {
    case 'NetworkError':
      return 'Could not reach the server. Check your connection and try again.';
    case 'UnauthorizedError':
      return 'Your session has expired. Please sign in again.';
    case 'ForbiddenError':
      return 'You do not have permission to do this.';
    case 'NotFoundError':
      return 'We could not find what you were looking for.';
    case 'ConflictError':
    case 'ValidationError':
      return error.message;
    case 'ServerError':
      return 'Something went wrong on our side. Please try again.';
    case 'InvalidResponseError':
      return 'The server sent an unexpected response. Please try again later.';
  }
};
