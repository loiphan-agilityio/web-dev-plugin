---
name: develop-feature
description: Implements a feature end to end in an existing React + Effect + TanStack Query app, from a ticket, story or issue to a tested UI. Use for "implement this ticket/story/feature", "build the X page/screen", "add a form for X", "develop feature from this issue URL", "create a CRUD screen", including tickets that come with a design (it loads design-to-ui for the UI) or need update, delete or detail endpoints (it loads integrate-api for those). It reads the ticket, lists acceptance criteria and open questions, then writes schemas, API calls, queries, the form, the four UI states, routes, a unit test file and a Storybook story file for every component plus a page test, and runs pnpm check. Not for scaffolding a new project, wiring one endpoint on its own, or matching a design with no ticket (design-to-ui).
---

# develop-feature

Turn a ticket into a tested UI inside an app that already follows `CLAUDE.md` (feature folders under `src/features/<name>/`). Read the project's `CLAUDE.md` first: its commands, layout and version traps are authoritative. `references/` in this skill's directory holds a complete worked feature (todos: list + create form, a test file and a story file per component, 10 tests), verified on a fresh scaffold; copy its shape.

## Getting library APIs right

The stack is newer than most training data. Do not write these from memory; copy from `references/` or the installed types.

- **Effect 4.** Before writing Effect code, read `node_modules/effect/AGENTS.md` completely. Services are `Context.Service` (not `Context.Tag` or `Effect.Service`); HTTP is `effect/http` (not `@effect/platform`); errors are `Schema.TaggedError`; decode with `Schema.decodeUnknownEffect` / `Schema.decodeUnknownSync` (not `Schema.decodeUnknown(`); catch-all is `Effect.catch`; messages go through `Schema.check(Schema.isMinLength(1, { message }))`.
- **React Hook Form.** `effectTsResolver` is Effect-3 only and `zodResolver` does not apply: use `standardSchemaResolver` with explicit type arguments.
- **React Router 8.** No `react-router-dom`; import from `react-router`, and `RouterProvider` from `react-router/dom`.
- **MSW 3.** `http` / `HttpResponse` from `msw/http`, `delay` from `msw/utils/delay`, option `onUnhandledFrame` (not `onUnhandledRequest`). No `rest.get`.
- **TanStack Query 5.** `isPending` for the first load (not `isLoading`); object syntax; return the invalidate promise from `onSuccess`.
- **Tailwind 4.** No `tailwind.config.js`; use tokens (`text-muted-foreground`, `bg-background`).
- **shadcn.** Forms use `FieldGroup` + `Field`; the old `Form` / `FormField` wrapper is gone. `src/components/ui` is generated: re-add with the CLI, never edit.
- **Vitest 5.** `clearMocks` defaults to true; `vi.mock` only at top level. Never `jest.*`.
- **Storybook 10.** Types (`Meta`, `StoryObj`) from `@storybook/react-vite`; `@storybook/test` is gone (`play` gets `canvas` and `userEvent` from its context). API mocks go in `parameters.msw.handlers`, served by the template's worker: no `msw-storybook-addon` (it uses MSW 2's `onUnhandledRequest`).

## Workflow

### 0. Understand
- Read the ticket. A URL plus a matching CLI means read it with the CLI (`glab` for GitLab, `gh` for GitHub); otherwise ask the user to paste the ticket.
- Write down the acceptance criteria and the open questions.
- The ticket links or attaches a design (Figma link, screenshot, mockup)? Note it, the frames it covers, and what it does not show (states, mobile, dark); step 4 invokes the `design-to-ui` skill for it.
- A criterion blocked by an unanswered question is **excluded from scope** and named in the report. Never implement it on a guess: a plausible guess passes review and is wrong in production. Ask the user when the answer is cheap to get; keep going on the unblocked criteria meanwhile.

### 1. Plan
- List the files to create, using the layout below.
- Check `src/features/`, `src/components/` and `src/components/ui/` for things to reuse before writing new ones.
- Need a shadcn component that is not in `src/components/ui/`? `pnpm exec shadcn add <name>` (the `shadcn` companion skill covers composition).
- Starting from the todos feature: rename `todo`/`Todo` consistently (folder, files, exports, keys, URL paths) and replace the fields; keep the structure.

```
src/features/<name>/
  schemas.ts   api.ts   queries.ts   mocks.ts   routes.tsx
  __tests__/   schemas.test.ts
  components/  <name>-page.tsx, <name>-form.tsx, <name>-list.tsx,
               and a .stories.tsx beside each one
    __tests__/ <name>-page.test.tsx, <name>-form.test.tsx, <name>-list.test.tsx
```

Plus three registrations outside the folder: see step 5.

### 2. Schema, API, queries
Read `references/feature-layout.md` before writing these files; it has each one in full. The essentials:

- `schemas.ts`: Effect Schemas for API shapes and form input; derive types (`typeof X.Type`, `typeof X.Encoded`).
- `api.ts`: one `Effect.fn` per call, going through `ApiClient` (never `fetch`; lint rejects it). Retries live in TanStack Query only.
- `queries.ts`: a key factory, `queryOptions`, and mutation hooks. `runEffect` is the only bridge; pass the query `signal`. Mutations invalidate exactly the keys they change and return the invalidate promise from `onSuccess`.

The todos example covers a list (`GET`) and a create (`POST`) with a 422. When the ticket needs any other endpoint (`PUT` / `PATCH` / `DELETE`, a detail by id, filters or pagination) or an error the UI must handle besides 422 and 500 (404, 409, 401 / 403), invoke the `integrate-api` skill (Skill tool) before writing that endpoint, and follow it for the schema, `api.ts`, keys, invalidation, mocks and error tests. This skill still owns the plan, the UI, the wiring and the one Result block.

### 3. Form
React Hook Form with the Effect Schema as resolver: `standardSchemaResolver<Input, unknown, Output>(Schema.toStandardSchemaV1(Schema))`. Read `references/forms.md` before writing the form; it has the full component and edge cases.

- Build the resolver **once at module level**. Explicit type arguments are required: TypeScript cannot infer them through the intersection type `toStandardSchemaV1` returns.
- `useForm` takes Input and Output because `Schema.Trim` makes Encoded (what the user types) differ from Type (what is submitted).
- `Controller` + `Field` / `FieldLabel` / `FieldError`; `data-invalid` on `Field`, `aria-invalid` on the control; `noValidate` on `<form>`; `onSubmit={(event) => void onSubmit(event)}` (typescript-eslint `no-misused-promises`).
- Submit with `mutate(values, { onSuccess: reset + toast, onError: setFormErrors(form.setError, error) })`; disable submit while `isPending`; render server errors from `form.formState.errors.root?.server`.

### 4. UI
Every data screen renders four distinct states: loading (`isPending`, `role="status"` with an `aria-label`), error (`toUserMessage(error)` plus a retry button), empty (says what to do next, no `role="alert"`), success. Use Tailwind tokens, `cn` from `@/lib/utils`, `type="button"` on non-submit buttons, `aria-label` on icon-only buttons. Files are kebab-case, exports are PascalCase and named. Patterns: `references/ui-states.md`.

When the ticket has a design, invoke the `design-to-ui` skill (Skill tool) before writing UI code and follow it for tokens, component mapping and styling, and run its visual check after step 5 (the page needs its route and mock handlers first). The four states and the ticket's acceptance criteria still apply: a design that shows only the success state does not remove the others. Add its **Design gaps** line to the Result.

### 5. Routes and wiring
A feature exposes a lazy route factory (`todoRoutes = (): RouteObject[] => [...]`), spread into the app's route children. It is a function because React Router 8 empties a lazy route object after loading it, so a shared array would break the second router (every test creates one). Then register the feature in three places (the diff is in `references/feature-layout.md`, section Wiring):

1. `src/app/routes.tsx`: import the feature's route factory (`todoRoutes`) and add `...todoRoutes()` to the root route `children`.
2. `src/mocks/handlers.ts`: add the feature's default handlers (`...todosHandlers`) to `handlers`.
3. `src/app/root-layout.tsx`: add a `<Link>` in the nav.

### 6. Tests
- **Every component file gets a unit test file in `components/__tests__/`** (`components/<name>-form.tsx` → `components/__tests__/<name>-form.test.tsx`), never next to the source file, including components added later (item row, dialog, edit form). It renders that component alone with `renderWithProviders(<X />)` and covers its own states and interactions.
- The page test (`renderRoute('/path')`) checks only what needs the parts together: a created item shows up in the list. It does not repeat the component cases.
- Take `user` from the render result. MSW runs with `onUnhandledFrame: 'error'`: an unhandled request fails the test. Components that own a query or mutation are driven with `server.use(...)`, never by mocking hooks or `api.ts`.
- `create<Name>Handlers(initial)` gives fresh in-memory state; `<name>Mocks` gives pending (`delay('infinite')`), error and 422 responses.
- A later `server.use()` call wins; within one call the first matching handler wins.
- A toast is asserted as text (`findByText`): the render helpers mount the `Toaster`. Do not mock `sonner`.
- Minimum set: list test = the four states; form test = client validation, submit success (input cleared), server 422 field error; page test = create flow (item appears); schema unit tests with `Schema.decodeUnknownSync`.
- Query by role and label, never test ids.

Recipes: `references/testing.md`.

### 7. Stories
Read `references/stories.md` before writing stories.

- **Every component file gets a story file beside it** (`<name>-list.tsx` → `<name>-list.stories.tsx`), including components added later. `title: '<Feature>/<Component>'`, `const meta = { ... } satisfies Meta<typeof X>`.
- One story per state the component renders, driven by the feature's `mocks.ts` through `parameters.msw.handlers`: list = `Loading`, `Success`, `Empty`, `ErrorState`; form = `Default` plus a `play` story per server error it shows; page = `Default`.
- The preview already wraps every story in the query client, a router and the `Toaster`: add no providers in a story.
- Before the gates, check that every `components/*.tsx` has its `components/__tests__/*.test.tsx` and its `.stories.tsx` beside it.

### 8. Gates
Run `pnpm check` (lint, typecheck, test, build, Storybook build) and read the real output. Fix the cause. Never disable a lint rule, loosen a type, or delete an assertion to get green. If a gate cannot pass, say so in the report.

### 9. Report
Finish with the Result block below. Name every excluded criterion and the question that blocked it.

## References

- `references/feature-layout.md` — read when planning files or writing schemas, api, queries, mocks, routes (naming, wiring, the full contract).
- `references/forms.md` — read when building any form (full component, edit forms, server errors, the Input/Output split).
- `references/ui-states.md` — read when building a list or detail screen (loading, error, empty, success code, a11y rules).
- `references/testing.md` — read when writing tests (one file per component, state driving, `server.use` order, assertions, schema tests).
- `references/stories.md` — read when writing stories (the preview harness, one story per state, `play` for interaction states).

## Related skills

Companions installed in projects; priority when they disagree: CLAUDE.md and project skills, then `node_modules/effect/AGENTS.md` and installed types, then companions.

- `shadcn` — components, composition, Field layout. Ignore its Tailwind v3 / `tailwind.config.js` branch, its RSC / `"use client"` notes (inert on Vite) and `next-themes`.
- `react-router-data-mode` — routing and navigation. Written for v7: there is no `react-router-dom` in v8 and `hasErrorBoundary` is gone. Its loader-first data path is not ours (TanStack Query in components; loaders at most prefetch with `queryClient.ensureQueryData`), and its `useFetcher` mutations become `useMutation` + React Hook Form. Ignore `references/ssr.md` and `unstable_MiddlewareContext`.
- `react-hook-form` — performance (`useWatch`, `useController`, field arrays). Its resolver examples use `zodResolver`: use `standardSchemaResolver`. Skip its `integ-shadcn-*` rules (old `Form` / `FormField`). Its raw `fetch` + `setError('root.serverError')` becomes `setFormErrors(form.setError, error)` (which writes `root.server`; the companion's key would render nothing), and its `useQuery({ queryFn: fetchX })` becomes a `queryOptions` factory with `runEffect`.
- `react-testing` — RTL patterns. Vitest only (use `vitest-axe` if you want axe); its MSW imports are v2-style root `msw`, use `msw/http`; first load is `isPending`. It defines its own `renderWithProviders` (MemoryRouter + a theme provider) with the same name as ours: always import ours from `@/test/render`. Ignore its dead cross-references.
- `vercel-react-best-practices` — client-side performance (`rerender-*`, `js-*`, `advanced-*`, most `bundle-*`). Skip `server-*`, `async-api-routes`, `async-suspense-boundaries`, `rendering-hydration-*`, `rendering-resource-hints`, `rendering-script-defer-async`. Replace `next/dynamic` with `React.lazy`, `optimizePackageImports` with direct imports, SWR with TanStack Query, and the raw `fetch` / Promise examples (`async-parallel`, `async-defer-await`) with Effect (`Effect.all` with `concurrency`).
- `vercel-composition-patterns` — compound components, React 19 APIs; its examples use React Native `TextInput`, adapt to DOM / shadcn.
- `integrate-api` (project skill) — one endpoint end to end (schema, `ApiClient` call, keys, invalidation, MSW, error tests). Step 2 loads it for every endpoint beyond list + create; it hands the UI, wiring and Result back here.
- `design-to-ui` (project skill) — building a UI that matches a design (screenshot, mockup, Figma). With a ticket, this skill leads and `design-to-ui` does the visual work; it hands data work back here.

## Result

End every run with:

```
## Result
**Did:** what was built (files, routes, the test file and story file for each component and the page) and the `pnpm check` outcome
**Saw:** facts observed (ticket details, existing code reused, surprises, code/doc mismatches)
**Not done:** criteria excluded from scope, and anything skipped
**Blocked by:** the unanswered questions behind each exclusion
**Next:** what the user should answer or do
```
