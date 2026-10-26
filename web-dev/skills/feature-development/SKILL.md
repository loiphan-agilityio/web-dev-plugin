---
name: feature-development
description: This skill should be used when the user asks to "implement this ticket", "build the X page", "add a form for X", "create a CRUD screen" or "develop the feature in this issue" in an app built from the web-dev template (React, Effect, TanStack Query, React Hook Form, shadcn/ui). It turns one ticket into a tested feature folder with schemas, business rules, API calls, queries, form, the four UI states, routes, tests and stories. Not for a new project (project-setup), one endpoint alone (api-integration) or a design with no ticket (ui-development).
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's references/ and scripts/ and the api-integration and ui-development skills' references. Needs Node 22.22 or newer and pnpm."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs *) Bash(pnpm -w check:report) Bash(pnpm lint) Bash(pnpm lint:fix) Bash(pnpm test) Bash(pnpm test *) Bash(pnpm test:e2e) Bash(pnpm test:e2e:install) Bash(pnpm check) Bash(pnpm exec shadcn add *) Bash(pnpm --filter web test *) Bash(pnpm --filter web exec shadcn add *) Bash(npm run format) Bash(yarn format) Bash(bun run lint:fix)
---

# feature-development

Turn one ticket into a tested feature in `src/features/<name>/`. `references/` holds the worked todos feature (a list and a create form), verified in a project from the boilerplate: copy its shapes, never library code from memory.

Before writing code, read the project's `CLAUDE.md`, `../../references/stack-guidelines.md` (version traps) and, for Effect code, `node_modules/effect/AGENTS.md` in full. In a project not made from the template, read `references/outside-template.md` first. Before following a companion skill, read its entry in `../../references/companions.md`.

Paths and commands below are the app folder's (`apps/web` in a project from the boilerplate). From the monorepo root, as under `develop`'s Workflow A, `pnpm lint:fix`, `pnpm check`, `pnpm test`, `pnpm test:watch` and `pnpm test:e2e:install` work as written, but the root scripts run turbo, which rejects the app's own flags: the rest take `--filter web` (`pnpm --filter web test <path> --coverage.enabled=false`, `pnpm --filter web exec shadcn add <name>`), and Effect's guide is `apps/web/node_modules/effect/AGENTS.md`.

## 1. Understand the ticket

Read the ticket. When `docs/tickets/<id>/` holds its contract (`intent.md`, `spec.md`, `plan.md`, written by the `ticket` skill), that folder is the ticket: its `AC-<n>` items are the acceptance criteria, its **Open questions** are already sorted (build around them as below), and you build in the order of its `T<n>` tasks. Tick each task and criterion (`- [x]`) once its tests pass, and run `node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs docs/tickets/<id>` at the end; the contract changes in the same branch as the code. Otherwise read the issue (`glab` or `gh` for an issue URL, else ask the user to paste it). List its acceptance criteria and sort every gap:

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
  components/  one folder per component: <Name>Page/, <Name>Form/, <Name>List/
    <Name>List/  index.tsx (the component), <Name>List.stories.tsx,
                 __tests__/<Name>List.test.tsx, and types.ts / utils.ts only it uses
e2e/<name>.spec.ts   the feature's main flow in a real browser (Playwright)
```

Starting from todos, rename `todo` / `Todo` everywhere (folders, files, exports, keys, URLs) and keep the structure (for a `customers` feature, `components/TodoList/` becomes `components/CustomerList/`; `references/feature-layout.md`, section components/). Reuse before writing: `src/components/`, then `@repo/ui/components/` (`packages/ui/src/components/`), then other features through their `schemas`, `model`, `queries` or `routes` (lint rejects another feature's `api`, `mocks` and `components`). A missing shadcn component comes from `pnpm exec shadcn add <name>` in `apps/web`; delete any extra file the CLI added that nothing imports (`toggle-group` brings `toggle`).

## 3. Schema, model, API, queries

Follow `references/feature-layout.md`: Effect Schemas with derived types in `schemas.ts`; every business rule the ticket states (sorting, totals, what counts as overdue) as a pure function in `model.ts`, with today's date as a parameter when the rule needs it; one `Effect.fn` per call through `ApiClient` in `api.ts`; a key factory, `queryOptions` and mutation hooks through `runEffect` in `queries.ts`. The full `schemas.ts`, `api.ts`, `queries.ts` and `mocks.ts` of todos are in the `api-integration` skill: `../api-integration/references/effect-http.md`, `react-query.md` and `msw.md`.

The todos feature covers one list (`GET`) and one create (`POST` with a 422). Invoke `api-integration` (Skill tool) before writing any other endpoint (a detail, a second `GET`, server-side filters, every `PUT` / `PATCH` / `DELETE`) or any error the UI must handle besides 422 and 500. This skill keeps the plan, the UI, the wiring and the Result.

## 4. Form

Follow `references/forms.md`. The traps: `effectTsResolver(Schema)` from `@hookform/resolvers/effect-ts` (version 6, built for Effect 4; no `zodResolver`), built once at module level; `useForm<Input, unknown, Output>` with the schema's Encoded and Type, since a literal union inferred from `defaultValues` widens to `string`; shadcn `FieldGroup` + `Field` (the old `Form` / `FormField` is gone); server errors through `setFormErrors(form.setError, error, form.getValues())`.

## 5. UI

Every data screen renders four distinct states: loading (`isPending`, `role="status"` with an `aria-label`), error (`toUserMessage(error)` plus a retry button), empty (says what to do next, no `role="alert"`), success, styled with theme tokens and `cn` from `@repo/ui/lib/utils`. Patterns and accessibility rules: `references/ui-states.md`.

With a design, invoke `ui-development` (Skill tool) before writing UI code (under `develop`'s Workflow A, skip it: step A4 applies the design once every feature exists), and run its visual check after step 6. A design that shows only the success state still gets the other three.

## 6. Routes and wiring

The feature exports a lazy route factory (`todoRoutes = (): RouteObject[] => [...]`), a function because React Router 8 empties a lazy route object once loaded. Register it in two places (diff in `references/feature-layout.md`, Wiring): `src/app/routes.tsx` (`...todoRoutes()` inside `protectedRoutes([...])`, or next to `...authRoutes()` for a public page) and `src/mocks/handlers.ts` (`...todosHandlers`); a `<Link>` too when `src/app/root-layout.tsx` has a nav.

## 7. Tests

Follow `references/testing.md`. Every component, including ones added later, gets its own test in its folder's `__tests__/` (`components/<Name>List/__tests__/<Name>List.test.tsx`), rendered alone with `renderWithProviders`. The page test (`renderRoute`) covers only flows that need the parts together. Drive states with `server.use(...)`, never by mocking hooks or `api.ts`. Query by role and label. Minimum: list = the four states; form = client validation, success (input cleared), server 422 next to its field; page = the create flow; schemas = `Schema.decodeUnknownSync`; model = each rule and its edges, without rendering.

One Playwright spec per feature, `e2e/<name>.spec.ts` (`references/testing.md`, End-to-end): the main flow from the feature's path (or the nav link, when the root layout has a nav) through the list and the form, on the default mock handlers and their fixtures; it signs in first. It runs in `pnpm check` and again in CI against the live Cloudflare Pages site after the production deploy, so it never assumes a host or port.

## 8. Stories

Follow `references/stories.md`. Every component gets a `<Name>.stories.tsx` in its folder with one story per state it renders, driven by the feature's `mocks.ts` through `parameters.msw.handlers`. The preview already provides the query client, router and `Toaster`. Done when every folder in `components/` has its `index.tsx`, its story and its test.

## 9. Gates

`pnpm lint:fix`, then `pnpm check`, each as a plain command with no pipe or redirect (the skill's `allowed-tools` and the project's allow-list cover exactly those). In a project from the boilerplate, run `pnpm -w check:report` instead of `pnpm check`: the same gates, run at the workspace root from any folder of it, ending with the checklist (each gate, the unit and e2e pass rates, line coverage) that goes in the Result. Fix the cause until green; a rule, a type and an assertion stay as strict as they are. If it stops at the e2e gate with "Executable doesn't exist", Chromium is missing on this machine: run `pnpm test:e2e:install` once, then the same gate command again (`pnpm -w check:report` in a project from the boilerplate). A gate that stays red goes in the Result.

## Result

Skip it under `develop`'s Workflow A or B (`develop` reports); otherwise end with:

```
## Result
**Did:** what was built (files, routes, the test file and story file for each component and the page) and the `pnpm check` outcome (in a project from the boilerplate, the `check:report` checklist)
**Saw:** facts observed (ticket details, existing code reused, surprises, code/doc mismatches)
**Not done:** criteria excluded from scope, and anything skipped
**Blocked by:** the unanswered questions behind each exclusion
**Next:** what the user should answer or do, including each unstated detail chosen for them to confirm
```

With a design, add the **Design gaps** line from `ui-development`.
