# Stack guidelines

The library versions this plugin is written for, and the APIs that changed in them. Every skill
reads this file before writing code. It holds for a project on these majors (one from the boilerplate, or a
project whose `package.json` pins the same majors). In a project on other majors, the installed
versions win: read its `package.json` and the types in `node_modules`, and do not apply a trap
from this file to a library the project does not have.

The boilerplate's `apps/web/CLAUDE.md` carries the section below, word for word, so a project
from it has the section without the plugin. `tools/check-guidelines.mjs` (in the repository, not shipped with the plugin) fails when the
two differ.

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
- **Tailwind 4:** CSS-first. Theme tokens live in `packages/ui/src/styles/globals.css`
  (`@theme inline`), shared by every app; a token only this app uses goes in
  `src/styles/index.css` after the `@import`. There is still no `tailwind.config.js`. Use tokens
  (`bg-background`, `text-muted-foreground`), not raw colors.
- **Vitest 5:** `clearMocks` is on by default; `vi.mock` must be at the top level of a file; never
  `jest.*`. Mock the API with MSW, never `vi.stubGlobal('fetch')` or `vi.mock` of an `api.ts`.
- **Storybook 10:** `Meta` / `StoryObj` from `@storybook/react-vite`; `@storybook/test` is gone
  (`play` gets `canvas` and `userEvent` from its context). API mocks go in
  `parameters.msw.handlers`; there is no `msw-storybook-addon`.
- **TypeScript 6:** `baseUrl` is deprecated; `paths` works without it.
