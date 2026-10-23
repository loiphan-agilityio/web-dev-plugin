# Effect Schema, Effect.fn and ApiClient

Read `node_modules/effect/AGENTS.md` completely before writing Effect code. Every code block below is copied from the boilerplate's `apps/web` or the verified todos feature.

## Schema (`features/<name>/schemas.ts`)

Response shapes and the request body, with derived types:

```ts file=src/features/todos/schemas.ts
import { Schema } from 'effect';

/** A todo as the API returns it. */
export const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
});
export type Todo = typeof Todo.Type;

export const TodoList = Schema.Array(Todo);
```

A request schema with a transform (`Schema.Trim`) has different Encoded (what a form collects) and Type (what the API gets):

```ts file=src/features/todos/schemas.ts
export const NewTodo = Schema.Struct({
  title: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Title is required' }),
      Schema.isMaxLength(100, { message: 'Keep the title under 100 characters' }),
    ),
  ),
});
export type NewTodo = typeof NewTodo.Type;
export type NewTodoInput = typeof NewTodo.Encoded;
```

The response schema is the contract. If the backend sends an extra field the app does not need, leave it out; if a field is missing or has another type, the call fails with `InvalidResponseError`.

## Effect.fn (`features/<name>/api.ts`)

One function per endpoint, named `'<name>.<action>'` for tracing:

```ts file=src/features/todos/api.ts
import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { type NewTodo, Todo, TodoList } from './schemas';

export const listTodos = Effect.fn('todos.list')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/todos', TodoList);
});

export const createTodo = Effect.fn('todos.create')(function* (input: NewTodo) {
  const api = yield* ApiClient;
  return yield* api.post('/todos', input, Todo);
});
```

No try/catch and no status handling here. The error channel is already `ApiError`.

## ApiClient surface (`src/lib/api/client.ts`)

`get(path, schema, { urlParams? })`, `post(path, body, schema)`, `put(path, body, schema)`,
`patch(path, body, schema)` return `Effect<schema Type, ApiError>`; `delete(path)` returns
`Effect<void, ApiError>`. The exact signatures are the `ApiClient` service interface in that file.

- Query string: `api.get('/todos', TodoList, { urlParams: { status: 'open' } })` (values are strings; convert numbers yourself).
- Path params: interpolate into the path (`` `/todos/${id}` ``). Ids from user input should be validated first; use `encodeURIComponent` for free text.
- `delete` returns `void` and decodes no body. An endpoint that deletes and returns a body, or a response with no schema (204 on POST/PUT), does not fit these methods: extend `ApiClient` (see "Changing ApiClient" below) rather than calling `HttpClient` from a feature.
- Need a method or option `ApiClient` lacks (headers, form data)? Add it to the service interface and to `ApiClient.layer`, so there is still one door to the backend.

## How ApiClient works inside

Read `ApiClient.layer` in `src/lib/api/client.ts`. It takes Effect's `HttpClient`, maps every
request (`prependUrl(apiUrl)` with `apiUrl` from `AppConfig`, `acceptJson`, then the `AuthToken`
bearer token through `HttpClient.mapRequestEffect`), applies
`filterStatusOk`, decodes the body with `HttpClientResponse.schemaBodyJson(schema)` and turns every
failure into an `ApiError` with `Effect.catch(toApiError)`. Bodies are sent with
`HttpClientRequest.bodyJsonUnsafe(body)`, which serialises with `JSON.stringify` and does not
validate. That is why callers pass already-decoded values.

Failure mapping is in [errors.md](errors.md). The layer is `.pipe(Layer.provide(FetchHttpClient.layer))`: the one place `fetch` is used, inside Effect.

## Changing ApiClient

Edit `src/lib/api/client.ts` only when an endpoint cannot be expressed with the current methods. Keep the change minimal, keep `toApiError` as the only error mapper, and re-run `pnpm check`. `ApiClient.layer` needs `AppConfig` and `AuthToken`; `AppLayer` in `src/lib/runtime.ts` provides them (`AppConfig.layer`, `AuthToken.none`). A new service layer is added there with `Layer.mergeAll`, and `AppServices` (the requirement type `runEffect` accepts) follows automatically.

## Auth

`AuthToken` (`src/lib/api/auth.ts`) holds where the bearer token comes from, read again for every request. A project from the boilerplate without authentication sends none (`AuthToken.none`); with authentication, `runtime.ts` already provides `AuthToken.fromGetter(tokenStore.get)` from `src/features/auth`. For an app with sign-in but no such feature, change one line in `src/lib/runtime.ts`: `AuthToken.none` becomes `AuthToken.fromGetter(() => <the token the session holds>)`; `ApiClient` then sends `Authorization: Bearer <token>`, and a 401 still reaches the UI as `UnauthorizedError` (route it to the sign-in page). How the session stores the token, and the sign-in screen and its endpoint, are the app's; build them as a feature, ask the user where the token lives, and name `runtime.ts` in the Result since every request changes. `client.test.ts` shows how to test with other layers (`Layer.succeed(AppConfig, ...)`, `AuthToken.fromGetter`).
