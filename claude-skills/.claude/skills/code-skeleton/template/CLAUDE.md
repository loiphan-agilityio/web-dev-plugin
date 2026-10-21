# app-template

Single-page app: React 19, Vite 8, TypeScript 6 (strict), Effect 4, TanStack Query 5,
React Hook Form 7, shadcn/ui on Tailwind CSS 4, React Router 8. Tests: Vitest 5, React Testing
Library, MSW 3. Package manager: pnpm. No SSR, no Next.js.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server. `pnpm dev:mock` (Vite mode `mock`, reads `.env.mock`) serves the API from `src/mocks` (MSW), in any shell. |
| `pnpm lint` | ESLint (`--max-warnings=0`, also enforces the import rules below) and `prettier --check`. `pnpm lint:fix` fixes what it can and formats; run it before `pnpm check`. |
| `pnpm typecheck` | `tsc -b` |
| `pnpm test` | Vitest once, with coverage (≥ 80% lines in `src/features` and `src/lib`). `pnpm test:watch` to watch. |
| `pnpm build` | Typecheck + production build. |
| `pnpm storybook` | Storybook on port 6006 (stories render inside `.storybook/story-providers.tsx`, MSW on). |
| `pnpm build-storybook` | Static Storybook build; fails when a story does not compile. |
| `pnpm check` | All five gates: lint, typecheck, test, build, Storybook build. **Run before calling work done.** |

Run each command on its own, exactly as written (`pnpm check`, not `pnpm check 2>&1 | tail` or `pnpm check > log; echo $?`): the project's `.claude/settings.json` allows the plain commands only, and the tool result already holds the output and the exit code.

## Layout

```
src/
  app/              routes.tsx (createRoutes), providers.tsx, root-layout.tsx, route-error.tsx
  components/ui/    shadcn components: add with `pnpm exec shadcn add <name>`, never edit by hand
  components/       shared app components: PageHeader, LoadingState, ErrorAlert, EmptyState;
                    reuse them before writing new markup
  features/<name>/  one folder per feature (names below are from a `todos` feature):
    schemas.ts        Effect Schemas + derived types: Todo, TodoList, NewTodo / NewTodoInput
    api.ts            Effect.fn functions that call ApiClient: listTodos, createTodo
    queries.ts        key factory todoKeys, todoListQueryOptions(), mutation hooks useCreateTodo()
    mocks.ts          createTodosHandlers(initial) + todosMocks (MSW)
    routes.tsx        todoRoutes() — lazy route objects
    components/       kebab-case files, PascalCase named exports, a .stories.tsx beside each one,
                      a .test.tsx for each one in components/__tests__/
  lib/
    config.ts         every env value (VITE_*), read statically and validated with Effect Schema
    runtime.ts        AppLayer + the ManagedRuntime
    query-client.ts   createQueryClient(); query errors are typed as ApiError
    forms.ts          setFormErrors(): API errors → React Hook Form
    utils.ts          cn()
    api/client.ts     ApiClient: the only way to call the backend
    api/errors.ts     ApiError union + toUserMessage()
    api/run.ts        runEffect(effect, signal): Effect → Promise for TanStack Query
  mocks/            handlers.ts (all feature handlers), server.ts (Vitest), browser.ts (dev)
  test/             setup.ts, render.tsx (renderRoute, renderWithProviders)
.claude/settings.json  the pnpm commands the skills run, allowed without a permission prompt
```

## Code style

Lint enforces it, and `func-style` has no autofix, so write it this way from the start:

- Arrow functions only: `export const TodoList = () => { ... };`, `export const useX = () => ...`.
  `function*` stays only inside `Effect.gen` / `Effect.fn`. A component that only returns markup
  returns it directly: `export const Page = () => (<section>...</section>);`.
- Destructure objects (`const { title } = todo`, props, callback arguments), use shorthand
  properties, template literals instead of `+`, `??` / `?.`, `const` (never `var`), `===`.
- A handler that returns nothing gets braces: `onClick={() => { setOpen(true); }}`, not
  `onClick={() => setOpen(true)}` (`no-confusing-void-expression`).
- Inline type imports (`import { type Todo, NewTodo } from './schemas'`); `pnpm lint:fix`
  fixes most of the rest and formats.

## How data flows

`component → useQuery(xQueryOptions()) / useXMutation() → runEffect → Effect.fn in api.ts →
ApiClient → effect/http`

- **Never call `fetch` (or axios, or `XMLHttpRequest`) in app code.** Every request goes through
  `ApiClient`, which prefixes `config.apiUrl`, decodes the body with the schema you pass, and
  maps every failure to an `ApiError`. Lint rejects `fetch`, `window.fetch`, `globalThis.fetch`,
  `XMLHttpRequest` and `axios`.
- **`runEffect` is the only bridge to TanStack Query.** Pass the query's `signal` so
  cancellation aborts the request. It rejects with the typed `ApiError`, so `query.error._tag`
  is safe to switch on.
- **Retries live in TanStack Query only** (queries: once, and only for `NetworkError` /
  `ServerError`; mutations: never). Do not add `HttpClient.retryTransient`.
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
- **Routes are factories** (`createRoutes()`, `<name>Routes()`): React Router mutates route
  objects when a lazy route loads, so each router needs fresh ones.

## Testing

- `renderRoute('/path')` renders the real route tree; `renderWithProviders(<X />)` renders one
  component. Both return `{ user, queryClient, router, ...rtl }`; use `user` (user-event).
  Both mount the `Toaster`, so a toast is asserted as text (`findByText`); do not mock `sonner`.
- MSW runs for every test with `onUnhandledFrame: 'error'`: a request without a handler fails
  the test. Drive states with `server.use(...)`; **a later `server.use()` call wins**, and
  within one call the first matching handler wins.
- Each feature's `mocks.ts` exports `create<Name>Handlers(initial)` (fresh in-memory data per
  call) and `<name>Mocks` (pending / error / validation responses). List a fixed path before a
  path with a parameter (`/tasks/stats` before `/tasks/:id`): the first match wins, and
  `:id` would match `stats`.
- Tests live in a `__tests__/` folder next to the code they test, never beside the file itself
  (`components/x.tsx` → `components/__tests__/x.test.tsx`, `schemas.ts` → `__tests__/schemas.test.ts`).
  Every component file has a unit test file there that renders it
  alone with `renderWithProviders(<X />)`. The page test (`renderRoute`) covers only how the
  parts work together, not each component's cases again.
- Query by role and label, not test ids. Test all four states and every form error path.
- After a navigation to a lazy route, wait for the new page (`findBy*`) before asserting:
  until the route loads, the old page is still on screen.

## Stories

- Every component file has a `.stories.tsx` beside it (`components/x.tsx` →
  `components/x.stories.tsx`), with one story per state it renders, driven by the feature's
  `mocks.ts` through `parameters.msw.handlers`.
- The preview (`.storybook/preview.tsx`) wraps every story in the same providers as a test and
  starts the app's MSW worker: add no providers in a story.

## Commits

- Messages follow Conventional Commits: `type(scope): summary` (`feat`, `fix`, `docs`, `refactor`,
  `test`, `chore`...). The `commit-msg` hook rejects anything else (commitlint).
- The `pre-commit` hook runs ESLint and Prettier on the staged files (lint-staged), then
  `pnpm typecheck`. Fix what it reports; never commit with `--no-verify`.
- The hooks are installed by `pnpm install` inside a git repository (husky, `prepare` script).
  After a `git init`, run `pnpm install` once more to turn them on.
- `.gitattributes` keeps every file LF, so a checkout with `core.autocrlf=true` still passes Prettier.

## Library versions newer than most training data

These APIs changed recently and are easy to recall wrong. Lint catches some; the rest compile
fine and fail at runtime.

**Learning more about Effect.** This repository uses the Effect TypeScript library. Before
writing any Effect code, first read `node_modules/effect/AGENTS.md` **completely**, and follow
the links in the file when required. If you need to learn more about particular Effect APIs
and concepts that the guide doesn't cover, search through the source code in
`node_modules/effect/src`.

- **Effect 4:** services are `Context.Service`, not `Context.Tag` / `Effect.Service`. HTTP is
  `effect/http`, not `@effect/platform`. Errors are `Schema.TaggedError`. Decode with
  `Schema.decodeUnknownEffect` (failure: `SchemaError`), or `Schema.decodeUnknownSync` in tests.
  Catch-all is `Effect.catch`. Functions are `Effect.fn('name')(function* () { ... })`. Validation
  messages go through `Schema.check(Schema.isMinLength(1, { message }))`.
- **React Hook Form + Effect:** `@hookform/resolvers` 6 ships `effectTsResolver` for Effect 4
  (`@hookform/resolvers/effect-ts`); it takes the Schema itself. Older docs say it is Effect-3
  only; that was version 5. No `zodResolver`, no `Schema.toStandardSchemaV1` wrapper.
- **React Router 8:** there is no `react-router-dom`. Import from `react-router`, and
  `RouterProvider` from `react-router/dom`.
- **MSW 3:** `http` / `HttpResponse` from `msw/http`; `delay` / `bypass` / `passthrough` from
  `msw/utils/<name>`; `setupServer` from `msw/node`, `setupWorker` from `msw/browser`; no
  `rest.get`; `onUnhandledRequest` is now `onUnhandledFrame`. Precedence: a later `server.use()`
  call wins; within one call the first matching handler wins.
- **TanStack Query 5:** `isPending` for the first load; object syntax only; `queryOptions()`.
- **Tailwind 4:** CSS-first. Theme tokens live in `src/styles/index.css` (`@theme inline`);
  there is no `tailwind.config.js`. Use tokens (`bg-background`, `text-muted-foreground`),
  not raw colors.
- **Vitest 5:** `clearMocks` is on by default; `vi.mock` must be at the top level of a file; never
  `jest.*`. Mock the API with MSW, never `vi.stubGlobal('fetch')` or `vi.mock` of an `api.ts`.
- **Storybook 10:** `Meta` / `StoryObj` from `@storybook/react-vite`; `@storybook/test` is gone
  (`play` gets `canvas` and `userEvent` from its context). API mocks go in
  `parameters.msw.handlers`; there is no `msw-storybook-addon`.
- **TypeScript 6:** `baseUrl` is deprecated; `paths` works without it.

## Skills

Skills (the `web-app-skills` plugin, or copied into `.claude/skills/` or `~/.claude/skills/`):

- `build-app` — one description of an app → a plan (`docs/plan.md`), then the scaffold and every
  feature through the skills below, gates, and the app running on mocks. Decides instead of asking.
- `code-skeleton` — scaffold a new app from this template.
- `develop-feature` — ticket → schema, API, queries, form, UI, tests. Loads `integrate-api` for
  endpoints beyond list + create, and `design-to-ui` when the ticket has a design.
- `integrate-api` — add or change an endpoint: schema, `ApiClient` call, query/mutation, MSW.
- `design-to-ui` — a design (screenshot, mockup, Figma, DESIGN.md; asks once if none) → a UI
  that matches it: tokens, shadcn components, states, tests, visual check.

Companion skills (installed by `install-companions.sh`): `shadcn`, `react-router-data-mode`,
`vite`, `vitest`, `vercel-react-best-practices`, `vercel-composition-patterns`,
`react-hook-form`, `react-testing`.

**Priority when they disagree:** this file and the five project skills, then
`node_modules/effect/AGENTS.md` and the installed type definitions, then companion skills.
Companions are generic: ignore their Next.js / SSR / RSC advice, zod resolvers, Jest,
`react-router-dom`, raw `fetch` examples and loader-first data fetching.
