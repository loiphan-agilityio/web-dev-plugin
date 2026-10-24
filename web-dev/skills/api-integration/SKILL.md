---
name: api-integration
description: This skill should be used when the user asks to "add an endpoint", "call the API", "hook this up to the backend", "add a mutation", "handle the 404/422 from the API", "mock this endpoint", "add an ApiError case" or "invalidate the cache after a write" in an app built from the web-dev template (Effect HttpClient, TanStack Query, MSW). It wires one endpoint with its schema, Effect.fn, query or mutation, MSW handlers and error tests. Not for a new project (project-setup) or a whole feature with screens and routes (feature-development).
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's references/ and scripts/ and the feature-development skill's references. Needs Node 22.22 or newer and pnpm."
allowed-tools: Bash(pnpm lint) Bash(pnpm lint:fix) Bash(pnpm typecheck) Bash(pnpm test) Bash(pnpm test *) Bash(pnpm test:e2e:install) Bash(pnpm check) Bash(pnpm --filter web test *)
---

# api-integration

Wire one endpoint through the app's data flow, with a typed error for every failure and an MSW handler for every state:

```
component -> useQuery(xQueryOptions()) / useXMutation() -> runEffect(effect, signal)
          -> Effect.fn in features/<name>/api.ts -> ApiClient -> effect/http
```

Before writing code, read `node_modules/effect/AGENTS.md` in full, `../../references/stack-guidelines.md` (version traps), and the current `src/lib/api/client.ts`, `errors.ts` and the feature's `api.ts` / `queries.ts` / `mocks.ts` when they exist: match them. In a project not made from the template, read `references/outside-template.md` first. Before following a companion skill, read its entry in `../../references/companions.md`.

Paths and commands below are the app folder's (`apps/web` in a project from the boilerplate). From the monorepo root, as under `develop`'s Workflow A, Effect's guide is `apps/web/node_modules/effect/AGENTS.md` and one test file runs with `pnpm --filter web test <path> --coverage.enabled=false` (the root `test` runs turbo, which rejects Vitest's flags); `pnpm lint:fix` and `pnpm check` work as written.

**Loaded by `feature-development`:** do steps 1 to 5 for the endpoint, leave the page, routes and nav to it, and put what was done into its Result; its gate step runs the gates.

## 1. Contract

Method, path, request body, response body, error statuses: from the request, `docs/plan.md`, an OpenAPI or Swagger file, or the existing code and mocks. Ask only for a field still unknown (under `develop`'s Workflow A, the plan is the contract). Done when every field comes from one of those sources.

## 2. Schema and API function

In `schemas.ts`, an Effect Schema for the response and for a sent body, with `typeof X.Type` types ([references/effect-http.md](references/effect-http.md)). In `api.ts`, one `Effect.fn('<name>.<action>')` per endpoint: `const api = yield* ApiClient`, then `api.get` / `post` / `put` / `patch` / `delete` with the schema. `ApiClient` prefixes `apiUrl` from `AppConfig`, sends the `AuthToken` bearer token, decodes, and maps every failure to an `ApiError`, so `api.ts` has no `fetch` and no error handling. It sends bodies with `bodyJsonUnsafe`, which skips the schema: pass the already decoded `Type` side (the form resolver decodes).

## 3. Queries

In `queries.ts` ([references/react-query.md](references/react-query.md)): keys in the key factory (`todoKeys`), a `queryOptions` factory for a read, a mutation hook for a write, always through `runEffect`, with `signal` for queries. Mutations invalidate exactly the keys they change and return the `invalidateQueries` promise from `onSuccess`, so "success" never shows stale data. Retries live in `createQueryClient` only (queries once, for `NetworkError` or a 5xx `ServerError`; mutations never); `HttpClient.retryTransient` would multiply them past the 3 s `findBy*` timeout.

## 4. Errors in the UI

`runEffect` rejects with the typed `ApiError` (registered once through `Register.defaultError`). Switch on `error._tag`, show `toUserMessage(error)`, and put field errors on forms with `setFormErrors(form.setError, error)`. A mutation outside a form (a row's toggle or delete) handles its error in `mutate`'s `onError` at the call site; a form's call site is in `../feature-development/references/forms.md`. Statuses, tags and which tests each needs: [references/errors.md](references/errors.md).

## 5. Mocks and tests

Extend `createTodosHandlers(initial)` and `todosMocks` (pending, error, validation) in `mocks.ts`, with URLs built from `config.apiUrl`, and register the handlers in `src/mocks/handlers.ts` ([references/msw.md](references/msw.md)). Test success, every error tag the endpoint can produce, and for a mutation the invalidation. A test goes in the test file of the component that shows the result (`components/<Name>/__tests__/<Name>.test.tsx`); only flows across components go in the page test. `client.test.ts` already proves the status-to-`ApiError` mapping, so feature tests check what the UI does with the error. Toasts are asserted as text with `findByText`. Test file layout and rules: `../feature-development/references/testing.md`.

## 6. Gates

`pnpm lint:fix`, then `pnpm check`, each as a plain command with no pipe or redirect. Fix the cause until green; a rule, a type and an assertion stay as strict as they are. If it stops at the e2e gate with "Executable doesn't exist", Chromium is missing on this machine: run `pnpm test:e2e:install` once, then `pnpm check` again.

Auth: `ApiClient` sends the bearer token `AuthToken` gives, `AuthToken.none` in a project without authentication, the token of `src/features/auth` with it. For an app with sign-in but no such feature, provide `AuthToken.fromGetter(...)` in `src/lib/runtime.ts` ([references/effect-http.md](references/effect-http.md), Auth), only when asked, and name `runtime.ts` in the Result.

## Result

Skip it when `feature-development` loaded this skill or under `develop`'s Workflow B (the caller reports); otherwise end with (`Saw` is what was observed, such as the real gate output):

```
## Result
**Did:** the endpoint, the files changed, the tests, and the `pnpm check` outcome
**Saw:** facts observed, including the real gate output
**Not done:** anything skipped
**Blocked by:** contract details still unknown, or "nothing"
**Next:** what the user should answer or do
```
