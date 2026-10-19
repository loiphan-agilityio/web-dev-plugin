---
name: integrate-api
description: Add or change one backend endpoint in an app built on the Effect 4 HttpClient + TanStack Query stack (ApiClient, runEffect, MSW 3). Use when asked to "add an endpoint", "call the API", "hook this up to the backend", "fetch X from the server", "add a mutation", "the API returns 422 / handle API errors", "mock this endpoint", "add an ApiError case", or to invalidate/update cached data after a write. Covers the Effect Schema, the Effect.fn in api.ts, queryOptions or mutation hooks, MSW handlers, and tests for success, 404/422/500/network and invalidation. Not for scaffolding a project or building a whole feature (screens, forms, routes) from a ticket.
---

# Integrate an API endpoint

Wire one endpoint through the app's fixed data flow, with a typed error for every failure and an MSW handler for every state. The app is the one scaffolded from the project template; `CLAUDE.md` in the repo root is the source of truth for names and commands.

```
component -> useQuery(xQueryOptions()) / useXMutation() -> runEffect(effect, signal)
          -> Effect.fn in features/<name>/api.ts -> ApiClient -> effect/http
```

## When to use

- Add, change or remove a call to a backend endpoint (GET list/detail, POST/PUT/PATCH/DELETE).
- Handle a new HTTP status, add an `ApiError` case, or change how statuses map to errors.
- Mock an endpoint (tests and `VITE_API_MOCKING=true pnpm dev`).
- Decide what a mutation invalidates or writes into the cache.

Do not use for: scaffolding a new app, or building a whole feature (page, form, routes) from a ticket. Those are the `code-skeleton` and `develop-feature` skills. If a feature needs an endpoint, this skill covers that slice.

## Before writing any code

1. Read `node_modules/effect/AGENTS.md` completely. Effect 4 is newer than most training data; do not write Effect code from memory.
2. Read the current `src/lib/api/client.ts` and `errors.ts`, and the feature's existing `api.ts` / `queries.ts` / `mocks.ts` if the folder exists. Match them.
3. Get the endpoint contract: method, path, request body, response body, error statuses. If the contract is unknown, ask; do not invent fields.

## Steps

Work in `src/features/<name>/` (create the folder files you need; names below are fixed).

1. **Schema** (`schemas.ts`): Effect Schema for the response, and for the request body when it is sent. Derive types with `typeof X.Type`. See [references/effect-http.md](references/effect-http.md).
2. **API function** (`api.ts`): one `Effect.fn('<name>.<action>')` per endpoint that does `const api = yield* ApiClient` and calls `api.get/post/put/patch/delete` with the schema. No `fetch`, no error handling here: `ApiClient` already maps failures to `ApiError`.
3. **Queries** (`queries.ts`): add keys to the key factory (`todoKeys`), a `queryOptions` factory for reads (`todoListQueryOptions`), a mutation hook for writes (`useCreateTodo`). Always go through `runEffect`; pass `signal` for queries. See [references/react-query.md](references/react-query.md).
4. **Mocks** (`mocks.ts`): extend the handler factory (`createTodosHandlers(initial)`) and the one-off states (`todosMocks`: pending, error, validation). Register the feature's handlers in `src/mocks/handlers.ts`. See [references/msw.md](references/msw.md).
5. **Tests**: success, each error tag this endpoint can produce (see [references/errors.md](references/errors.md)), and for mutations the invalidation (the list shows the new data). Use `renderRoute` / `renderWithProviders` and `server.use(...)`. Each test goes in the test file of the component that shows the result (a toggle in the list → `todo-list.test.tsx`, rendered alone with `renderWithProviders`); a new component gets its own `.test.tsx`; only flows that span components (invalidation shown in another component) go in the page test. `src/lib/api/client.test.ts` already proves every status → `ApiError` mapping, so feature tests check what the UI does with the error, not the mapping again.
6. **`pnpm check`** (lint, typecheck, test, build). Not done until it passes.

## Rules that are easy to break

- **Never call `fetch` or axios.** ESLint rejects `fetch` (`no-restricted-globals`) and `axios` (`no-restricted-imports`). Everything goes through `ApiClient`, which prefixes `config.apiUrl`, applies `filterStatusOk`, decodes with the schema and maps every failure to an `ApiError`.
- **Callers pass already-decoded values.** `ApiClient` sends the body with `HttpClientRequest.bodyJsonUnsafe(body)`, which does not run the schema. Decode form input first (the form resolver does), then pass the `Type` side to the `Effect.fn`.
- **Retries live only in TanStack Query** (`createQueryClient`: queries retry once, only for `NetworkError` / `ServerError`; mutations never). Do not add `HttpClient.retryTransient`: it multiplies retries and pushes failing tests past React Testing Library's 1s `findBy*` timeout.
- **`runEffect` rejects with the typed error**, so `query.error` / mutation `error` is `ApiError` (declared once through `Register.defaultError`). Switch on `error._tag`; show text with `toUserMessage(error)`; put server field errors on forms with `setFormErrors(form.setError, error)`.
- **Mutations return the `invalidateQueries` promise** from `onSuccess`, so the mutation stays pending until the list has refetched and the UI never shows stale data after "success".
- **Auth header**: not implemented. The hook point is the commented line in `ApiClient.layer`'s `mapRequest` in `client.ts` (`HttpClientRequest.bearerToken(token)`). Adding auth changes a shared file; do it only when asked and say so in the result.
- **Mocks use `config.apiUrl`** (`const url = (path: string) => \`${config.apiUrl}${path}\``), so handlers match exactly what `ApiClient` requests in tests and in dev mocking.

## Getting library APIs right

These compile or read plausibly in older versions and fail here.

- **Effect 4**: services are `Context.Service` (not `Context.Tag` / `Effect.Service`); HTTP is `effect/http` (not `@effect/platform`, which lint rejects); errors are `Schema.TaggedError`; decode with `Schema.decodeUnknownEffect` (failure type `SchemaError`); catch-all is `Effect.catch`; functions are `Effect.fn('name')(function* () { ... })`.
- **`HttpClientError` has a `reason`** whose `_tag` is `TransportError | EncodeError | InvalidUrlError | StatusCodeError | DecodeError | EmptyBodyError`. That is why the app's schema-mismatch error is named `InvalidResponseError`: Effect already owns `DecodeError`.
- **MSW 3**: `http` and `HttpResponse` from `msw/http`; `delay`, `bypass`, `passthrough` from `msw/utils/<name>` (e.g. `msw/utils/delay`); `setupServer` from `msw/node`, `setupWorker` from `msw/browser`. `onUnhandledRequest` was renamed `onUnhandledFrame`; the test server uses `'error'`, so a request without a handler fails the test.
- **MSW precedence**: a later `server.use()` call wins; within one call the first matching handler wins. `server.use(...createXHandlers([]), xMocks.createInvalid(...))` silently uses the success handler. Use two calls.
- **TanStack Query 5**: object syntax only, `isPending` for first load (not `isLoading`), `queryOptions()` helper.
- **Vitest 5**: globals are on; `vi.mock` only at top level. For the API, mock the network with MSW, never `vi.stubGlobal('fetch')` and never `vi.mock` of an `api.ts` module.

## Related skills

Companion skills installed in projects (see `CLAUDE.md` for priority: project skills and `CLAUDE.md` win):

- `vitest`: Vitest API details (matchers, fake timers, `vi.fn`). Override: mock the network with MSW only (never `vi.stubGlobal('fetch')` or `vi.mock` of an api module); use pnpm, not npm; in `expect.schemaMatching` use an Effect Schema via `Schema.toStandardSchemaV1`, not zod; Browser Mode is not used.
- `react-testing`: React Testing Library patterns (queries, `user-event`, async). Override: its MSW snippets import `http` / `HttpResponse` from the `msw` root (v2 style); here they come from `msw/http`. Vitest only, no Jest (`vitest-axe` if you want axe). First load is `isPending`. It defines its own `renderWithProviders` with the same name as ours: import ours from `@/test/render`, or use `renderRoute`.
- Effect: the official guide is `node_modules/effect/AGENTS.md` (not a skill); read it first.
- There is deliberately no TanStack Query companion: the available one contradicted this stack in most examples (raw `fetch` query functions, `error.message` instead of tagged errors, `isLoading`, Suspense-first, TanStack Router loaders, SSR). [references/react-query.md](references/react-query.md) is the source.

## References

- [references/effect-http.md](references/effect-http.md): read when writing a schema, an `Effect.fn`, or calling a verb with params or a body; also how `ApiClient` works inside.
- [references/errors.md](references/errors.md): read when handling a status, adding an `ApiError` case, or deciding which error tests an endpoint needs.
- [references/react-query.md](references/react-query.md): read when writing keys, `queryOptions`, a mutation hook, invalidation or `setQueryData`.
- [references/msw.md](references/msw.md): read when writing handlers, adding states (pending/error/422), or tests that override them.

## Finish

End your final message with this block, filled in honestly:

```
## Result
**Did:** … **Saw:** … **Not done:** … **Blocked by:** … **Next:** …
```

`Saw` is what you observed (e.g. `pnpm check` output, test names that passed), not what you expect.
