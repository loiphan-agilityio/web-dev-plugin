# Spec: Claude Code skills for web development

## Intent

Give Claude a set of skills so that, asked to build part of a web app, it follows one set of
conventions on the first try: the same folder layout, the same API layer, the same error
handling and the same tests, with library APIs that match the installed versions rather than the
older ones in its training data.

## Assignment

> Web development: React, Vite, TypeScript, Effect, React Query, React Hook Form and one UI
> framework. Include code skeleton, develop feature and integrate API.

## Stack

React 19 · Vite 8 · TypeScript 6 · Effect 4 · TanStack Query 5 (React Query) ·
React Hook Form 7 · shadcn/ui on Tailwind CSS 4 (the UI framework) · React Router 8 ·
Vitest 5 + React Testing Library + MSW 3 · Storybook 10 · pnpm 11.
Every version is pinned in the template's lockfile.

## Scope

| # | Requirement | Delivered by | Done when |
|---|---|---|---|
| 1 | **Code skeleton:** scaffold a working project (providers, Effect runtime, query client, path alias, lint, tests) | `code-skeleton` skill + `template/` (57 files) + `scaffold.sh` | A fresh scaffold passes lint, typecheck, test, build and Storybook build (`verify.sh`, also run by CI) |
| 2 | **Develop feature:** ticket → tested UI (schema, API layer, queries/mutations, form, UI, tests) | `develop-feature` skill + a worked todos feature in its `references/` | A ticket becomes a page with the four data states, a test file and a story per component, and `pnpm check` passes |
| 3 | **Integrate API:** Effect Schema + HttpClient with typed errors, `queryOptions` / mutations, MSW mocks | `integrate-api` skill + `ApiClient`, `runEffect`, `ApiError` in the template | Every backend failure maps to one of 7 typed `ApiError` cases; 404, 422 and 500 paths are tested |
| 4 | **One message, whole app:** a description on any topic becomes a running POC without further input | `build-app` skill: plans `docs/plan.md`, then drives the other four, runs the gates and opens the app on mocks | One prompt yields a scaffold, every planned feature, five green gates and an app that runs with `pnpm dev:mock`; every decision made for the user is listed |
| + | Not in the assignment: build a UI that matches a design (screenshot, mockup, Figma) | `design-to-ui` skill | Theme tokens, shadcn components and the four data states, no raw colors |

### Each skill must

- Trigger from the words a developer would type ("Scaffold a new web app", "Implement this
  ticket", "Add PATCH /todos/:id", "Make it look like this screenshot"), and not trigger on
  requests that belong to another skill.
- Copy every code example from the verified template or the worked feature, never from memory.
- Run `pnpm check` (all five gates; lint includes a Prettier check) before reporting done.
- End with a `## Result` block: Did / Saw / Not done / Blocked by / Next.
- Exclude an acceptance criterion that depends on an unanswered question (data, a business rule,
  what the backend must agree with), and name it in the report instead of guessing. A detail the
  ticket leaves out that only changes presentation gets the simplest default, listed under
  **Next** for the user to confirm. When the ticket states the rule and leaves only its edges
  open (inclusive bounds, from today or tomorrow), the skill builds the literal reading, tests it
  and asks under **Next**.

### The generated app must

- Call the backend only through `ApiClient` (lint rejects `fetch` in any form, `XMLHttpRequest`
  and `axios`).
- Render four distinct states on every data screen: loading, error with retry, empty, success.
- Show server validation errors (422) next to the matching form fields.
- Mock every request with MSW in tests; an unhandled request fails the test.
- Keep at least 80% line coverage in `src/features/**` and `src/lib/**`.

## Proof of concept

`examples/task-tracker/` is a task tracker built only by the skills, one Claude Code session per
ticket, in this order:

| Step | Prompt | Skills the session invoked |
|---|---|---|
| 1 | Scaffold a new web app called task-tracker | `code-skeleton` |
| 2 | TASK-1: tasks list with status filter, search and a create form | `develop-feature` |
| 3 | TASK-2: task detail, edit, inline status change, delete, 404 handling | `develop-feature` → `integrate-api` |
| 4 | TASK-3: dashboard with stats from a new endpoint and a "Due soon" list | `develop-feature` |
| 5 | Match the two mockups in `examples/task-tracker/design/` | `design-to-ui` |

The prompts, each session's Result report, screenshots and a recording are in
[`docs/evidence/`](docs/evidence/README.md).

A second proof, for requirement 4: [`examples/library-manager/`](examples/library-manager/) came from
one message and no ticket, through `build-app`
([`docs/evidence/one-message/`](docs/evidence/one-message/README.md)).

## Out of scope

- SSR and Next.js, backend code, CI/CD pipelines for the generated apps.
- End-to-end browser tests (Playwright): the template has unit and component tests only.
- Applying the skeleton to an existing project: `scaffold.sh` refuses a folder with
  conflicting files.

## Distribution

The skills ship as the Claude Code plugin `web-app-skills`, listed by the marketplace at the
repository root. Install steps are in [`claude-skills/README.md`](claude-skills/README.md#install).
Eight third-party companion skills (shadcn, React Router, Vite, Vitest, React performance,
composition, React Hook Form, React Testing) are installed next to them, pinned to audited
commits.
