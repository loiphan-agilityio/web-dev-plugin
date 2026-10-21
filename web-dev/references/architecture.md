# Architecture

The data flow of a project scaffolded from the template: which layer calls which, and the rules
each layer keeps. A project with another layout keeps its own; the `develop` skill's project map
names the file that plays each role here (HTTP client, query layer, forms, test helpers), and
the skills work through those files instead.

A project scaffolded from the template carries the section below, word for word, in its own
`CLAUDE.md`. `tools/check-guidelines.mjs` (in the repository, not shipped with the plugin) fails when the
two differ.

## How data flows

`component → useQuery(xQueryOptions()) / useXMutation() → runEffect → Effect.fn in api.ts →
ApiClient → effect/http`

- **Never call `fetch` (or axios, or `XMLHttpRequest`) in app code.** Every request goes through
  `ApiClient`, which prefixes `apiUrl` from `AppConfig`, adds the `AuthToken` bearer token
  when there is one, decodes the body with the schema you pass, and
  maps every failure to an `ApiError`. Lint rejects `fetch`, `window.fetch`, `globalThis.fetch`,
  `XMLHttpRequest` and `axios`.
- **`runEffect` is the only bridge to TanStack Query.** Pass the query's `signal` so
  cancellation aborts the request. It rejects with the typed `ApiError`, so `query.error._tag`
  is safe to switch on.
- **Retries live in TanStack Query only** (queries: once, and only for `NetworkError` or a
  `ServerError` with a 5xx status; mutations: never). Do not add `HttpClient.retryTransient`.
- **Query keys come from a key factory** in `queries.ts`; mutations invalidate exactly the
  keys they change, and return that promise from `onSuccess`.
- **Every data screen renders four distinct states:** loading (`isPending`, not `isLoading`),
  error (with `toUserMessage` and a retry), empty (with the next action), success. Empty and
  error never look the same. Render the first three with `LoadingState`, `ErrorAlert` and
  `EmptyState` from `src/components/`, and the page title with `PageHeader`. Markup that a
  second feature needs goes to `src/components/`, with a test and a story.
- **Forms:** `useForm<Input, unknown, Output>({ resolver, defaultValues })` with
  `effectTsResolver(Schema)` built once at module level (`Input`/`Output` are the schema's
  Encoded/Type: inferred from `defaultValues`, a literal union widens to `string`), `Controller` + shadcn `Field` / `FieldLabel` / `FieldError`,
  `data-invalid` on `Field`, `aria-invalid` on the control. Server errors go through
  `setFormErrors(form.setError, error)`.
- **Business rules are pure functions in the feature's `model.ts`** (what sorts first, a total,
  what counts as overdue), tested in `__tests__/model.test.ts` without rendering. Components and
  queries call them instead of computing a rule inline; a rule that needs today's date takes it as
  a parameter, so it stays pure.
- **A feature uses another feature only through its `schemas`, `model`, `queries` or `routes`.**
  Its `api`, `mocks` and `components` are internal, and lint rejects importing them from another
  feature. Imports inside a feature are relative.
- **Routes are factories** (`createRoutes()`, `<name>Routes()`): React Router mutates route
  objects when a lazy route loads, so each router needs fresh ones.
