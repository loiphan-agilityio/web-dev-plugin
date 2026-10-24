# ApiError and status mapping

All in `src/lib/api/errors.ts` and `src/lib/api/client.ts`. Every API failure is one member of the `ApiError` union in `errors.ts`, each a `Schema.TaggedError`:

## Status to error

| Situation | Error | Test it with |
|---|---|---|
| No response (offline, DNS, CORS, reset) | `NetworkError` | `HttpResponse.error()` |
| 401 | `UnauthorizedError` | `{ status: 401 }` |
| 403 | `ForbiddenError` | `{ status: 403 }` |
| 404 | `NotFoundError` | `{ status: 404 }` |
| 400 / 422 | `ValidationError { message, fields }` | body `{ message, errors: { field: 'text' } }` |
| any other non-2xx | `ServerError { status }` | `{ status: 500 }` |
| 2xx but body fails the schema | `InvalidResponseError { message }` | a body with a wrong field type |

`ValidationError` reads the 400/422 body with `ValidationBody` in `src/lib/api/client.ts`
(`{ message?, errors?: Record<string, string> }`); a malformed error body still yields a
`ValidationError`, with the default message and no fields.

If the real backend uses another error body shape, change `ValidationBody` and the mapping in `fromStatus`, and update `todosMocks`-style mocks to match. Do not parse error bodies in features.

## The mapping code

`fromStatus` (status → error) and `toApiError` (every `HttpClientError` / `SchemaError` → `ApiError`)
are in `src/lib/api/client.ts`; read both before changing a mapping. `toApiError` switches
exhaustively on `HttpClientError.reason._tag` (`TransportError | EncodeError | InvalidUrlError |
StatusCodeError | DecodeError | EmptyBodyError`), so a new Effect reason becomes a compile error, not
a silent gap.

## Changing how a status maps

Add a `case` in `fromStatus` (e.g. 409 to a new `ConflictError`, 429, 5xx splits). Anything not listed falls to `ServerError { status }`, which TanStack Query retries once.

## Adding a new ApiError case

1. `errors.ts`: add the class, same shape as the others, and add it to the `ApiError` union.
   ```ts sketch
   export class ConflictError extends Schema.TaggedError<ConflictError>()('ConflictError', {}) {}
   ```
2. `toUserMessage` in `errors.ts`: add a `case`. The switch is exhaustive over `error._tag`, so TypeScript flags it if you forget.
3. `client.ts`: import it and return it from `fromStatus` (or `toApiError`).
4. `query-client.ts`: decide whether it is transient. Only `NetworkError` and `ServerError` are retried; leave new 4xx cases out.
5. `src/lib/forms.ts` (`setFormErrors`) needs a change only if the new error carries field messages; otherwise it already falls through to `errors.root.server` with `toUserMessage`.
6. Add a mock (`<name>Mocks.<case>`) and a test. Existing `switch (error._tag)` in components fail typecheck until they handle the case; that is the point.

## Tests per endpoint

Test the success path plus every error the endpoint can really produce; not all seven apply to each one.

- Read (GET): loading, success, empty (a legitimate empty list is not an error), 500 with a retry that recovers, 404 for detail endpoints, network error if the UI differs.
- Write: success plus the visible result (invalidation), 422 with field errors under the right inputs, 500 or network error showing the root error, and that the submit button is not stuck pending.
- Never assert on error class internals; assert what the user sees (`toUserMessage` text, `role="alert"`).

Test client: no retries (`createTestQueryClient` in `src/test/query-client.ts`, used by `render.tsx` and Storybook, sets `retry: false`), so a failing request shows its error immediately. The retry policy itself belongs in a `createQueryClient` test, not in endpoint tests.

## Showing errors

- Queries: `query.error` is `ApiError`; render `toUserMessage(query.error)` plus a retry button (`query.refetch()`). Empty and error must look different.
- Mutations in forms: `mutate(values, { onError: (error) => setFormErrors(form.setError, error, form.getValues()) })`. Field errors land under the inputs, everything else on `errors.root.server`.
