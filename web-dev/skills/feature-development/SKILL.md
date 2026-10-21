---
name: feature-development
description: This skill should be used when the user asks to "implement this ticket", "build the X page", "add a form for X", "create a CRUD screen" or "develop the feature in this issue" in an app built from the web-dev template (React, Effect, TanStack Query, React Hook Form, shadcn/ui). It turns one ticket into a tested feature folder with schemas, business rules, API calls, queries, form, the four UI states, routes, tests and stories. Not for a new project (project-setup), one endpoint alone (api-integration) or a design with no ticket (ui-development).
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's references/ and scripts/ and the api-integration and ui-development skills' references. Needs Node 22.22 or newer and pnpm."
allowed-tools: Bash(pnpm lint) Bash(pnpm lint:fix) Bash(pnpm typecheck) Bash(pnpm test) Bash(pnpm test *) Bash(pnpm check) Bash(pnpm exec shadcn add *) Bash(pnpm format) Bash(npm run lint:fix) Bash(npm run format) Bash(yarn lint:fix) Bash(yarn format) Bash(bun run lint:fix) Bash(bun run format)
---

# feature-development

Turn one ticket into a tested feature in `src/features/<name>/`. `references/` holds the worked todos feature (a list and a create form), verified on a fresh scaffold: copy its shapes, never library code from memory.

Before writing code, read the project's `CLAUDE.md`, `../../references/stack-guidelines.md` (version traps) and, for Effect code, `node_modules/effect/AGENTS.md` in full. In a project not made from the template, read `references/outside-template.md` first. Before following a companion skill, read its entry in `../../references/companions.md`.

## 1. Understand the ticket

Read the ticket (`glab` or `gh` for an issue URL, else ask the user to paste it). List its acceptance criteria and sort every gap:

- **Open question:** the answer changes data, a business rule or the backend contract (what counts as "due soon", whether a delete is soft). Exclude the criterion that depends on it, ask in one message, and keep building the rest. A plausible guess passes review and is wrong in production.
- **Unstated detail:** presentation only, easy to change (a label, an on-screen sort order). Build the simplest option that fits the existing screens; list it under **Next**.
- **Edge of a stated rule:** the rule is given, its edges are not (inclusive bounds, "next 7 days" from today or tomorrow). Build the literal reading, pin it in a test, ask under **Next**.
- No rule stated and the kind is unclear: an open question.

Under `develop`'s Workflow A the ticket comes from `docs/plan.md`: a gap the plan leaves open gets a default added to its Assumptions, every criterion stays in scope, and `develop` writes the Result.

A design attached to the ticket (Figma link, screenshot, `DESIGN.md`): note the frames and what they leave out; step 5 hands it to `ui-development`.

Done when every criterion is in scope or excluded with its question.

## 2. Plan the files

```
src/features/<name>/
  schemas.ts   model.ts   api.ts   queries.ts   mocks.ts   routes.tsx
  __tests__/   schemas.test.ts, model.test.ts
  components/  <name>-page.tsx, <name>-form.tsx, <name>-list.tsx,
               and a .stories.tsx beside each one
    __tests__/ <name>-page.test.tsx, <name>-form.test.tsx, <name>-list.test.tsx
```

Starting from todos, rename `todo` / `Todo` everywhere (folder, files, exports, keys, URLs) and keep the structure. Reuse before writing: `src/components/` (`PageHeader`, `LoadingState`, `ErrorAlert`, `EmptyState`), then `src/components/ui/`, then other features through their `schemas`, `model`, `queries` or `routes` (lint rejects another feature's `api`, `mocks` and `components`); markup a second feature needs moves to `src/components/`. A missing shadcn component comes from `pnpm exec shadcn add <name>`; delete any extra file the CLI added that nothing imports (`toggle-group` brings `toggle`).

## 3. Schema, model, API, queries

Follow `references/feature-layout.md`: Effect Schemas with derived types in `schemas.ts`; every business rule the ticket states (sorting, totals, what counts as overdue) as a pure function in `model.ts`, with today's date as a parameter when the rule needs it; one `Effect.fn` per call through `ApiClient` in `api.ts`; a key factory, `queryOptions` and mutation hooks through `runEffect` in `queries.ts`. The full `schemas.ts`, `api.ts`, `queries.ts` and `mocks.ts` of todos are in the `api-integration` skill: `../api-integration/references/effect-http.md`, `react-query.md` and `msw.md`.

The todos feature covers one list (`GET`) and one create (`POST` with a 422). Invoke `api-integration` (Skill tool) before writing any other endpoint (a detail, a second `GET`, server-side filters, every `PUT` / `PATCH` / `DELETE`) or any error the UI must handle besides 422 and 500. This skill keeps the plan, the UI, the wiring and the Result.

## 4. Form

Follow `references/forms.md`. The traps: `effectTsResolver(Schema)` from `@hookform/resolvers/effect-ts` (version 6, built for Effect 4; no `zodResolver`), built once at module level; `useForm<Input, unknown, Output>` with the schema's Encoded and Type, since a literal union inferred from `defaultValues` widens to `string`; shadcn `FieldGroup` + `Field` (the old `Form` / `FormField` is gone); server errors through `setFormErrors(form.setError, error)`.

## 5. UI

Every data screen renders four distinct states: loading (`LoadingState`), error with retry (`ErrorAlert`), empty with the next action (`EmptyState`), success (the feature's own list or table), under a `PageHeader`, styled with theme tokens and `cn` from `@/lib/utils`. Patterns and accessibility rules: `references/ui-states.md`.

With a design, invoke `ui-development` (Skill tool) before writing UI code (under `develop`'s Workflow A, skip it: step A4 applies the design once every feature exists), and run its visual check after step 6. A design that shows only the success state still gets the other three.

## 6. Routes and wiring

The feature exports a lazy route factory (`todoRoutes = (): RouteObject[] => [...]`), a function because React Router 8 empties a lazy route object once loaded. Register it in three places (diff in `references/feature-layout.md`, Wiring): `src/app/routes.tsx` (`...todoRoutes()` in the root `children`), `src/mocks/handlers.ts` (`...todosHandlers`), and a `<Link>` in `src/app/root-layout.tsx`.

## 7. Tests

Follow `references/testing.md`. Every component file, including ones added later, gets its own test in `components/__tests__/`, rendered alone with `renderWithProviders`. The page test (`renderRoute`) covers only flows that need the parts together. Drive states with `server.use(...)` (a later call wins; within one call the first match wins), never by mocking hooks or `api.ts`. Query by role and label. Minimum: list = the four states; form = client validation, success (input cleared), server 422 next to its field; page = the create flow; schemas = `Schema.decodeUnknownSync`; model = each rule and its edges, without rendering.

## 8. Stories

Follow `references/stories.md`. Every component file gets a `.stories.tsx` beside it with one story per state it renders, driven by the feature's `mocks.ts` through `parameters.msw.handlers`. The preview already provides the query client, router and `Toaster`. Done when every `components/*.tsx` has its test and its story.

## 9. Gates

`pnpm lint:fix`, then `pnpm check`, each as a plain command with no pipe or redirect (the skill's `allowed-tools` and the project's allow-list cover exactly those). Fix the cause until green; a rule, a type and an assertion stay as strict as they are. A gate that stays red goes in the Result.

## Result

Skip it under `develop`'s Workflow A or B (`develop` reports); otherwise end with:

```
## Result
**Did:** what was built (files, routes, the test file and story file for each component and the page) and the `pnpm check` outcome
**Saw:** facts observed (ticket details, existing code reused, surprises, code/doc mismatches)
**Not done:** criteria excluded from scope, and anything skipped
**Blocked by:** the unanswered questions behind each exclusion
**Next:** what the user should answer or do, including each unstated detail chosen for them to confirm
```

With a design, add the **Design gaps** line from `ui-development`.
