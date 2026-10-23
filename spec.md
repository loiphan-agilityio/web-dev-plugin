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
Every version is pinned in the boilerplate's lockfile.

## Scope

| # | Requirement | Delivered by | Done when |
|---|---|---|---|
| 0 | **One entry point:** `/web-dev:develop <request>` sorts the request and the project, and runs the right workflow; the user never picks a skill | `develop` skill + `scripts/detect-project.mjs` | Each folder gets its tier (`fixtures/check-detect.sh`, run by `verify.sh`), and the routing evals in `web-dev/evals/` pass |
| 1 | **Code skeleton:** create a working project (providers, Effect runtime, query client, path alias, lint, tests) from the react-vite-boilerplate monorepo, with or without its authentication feature as the user chooses | `project-setup` skill + `scripts/create-project.sh` (runs the boilerplate's own generator) | Both variants are created, wired and refused as `tools/check-create-project.sh` expects (run by `verify.sh`); the generated project passes the boilerplate's `pnpm check` |
| 2 | **Develop feature:** ticket → tested UI (schema, API layer, queries/mutations, form, UI, tests) | `feature-development` skill + a worked todos feature in its `references/` | A ticket becomes a page with the four data states, a test file and a story per component, and `pnpm check` passes |
| 3 | **Integrate API:** Effect Schema + HttpClient with typed errors, `queryOptions` / mutations, MSW mocks | `api-integration` skill + `ApiClient`, `runEffect`, `ApiError` in the boilerplate's `apps/web` | Every backend failure maps to one of 7 typed `ApiError` cases; 404, 422 and 500 paths are tested |
| 4 | **One message, whole app:** a description on any topic becomes a running POC without further input | `develop` skill, Workflow A: plans `docs/plan.md`, then drives the other four, runs the gates and opens the app on mocks | One prompt yields a scaffold, every planned feature, five green gates and an app that runs with `pnpm dev:mock`; every decision made for the user is listed |
| 5 | **Existing project:** a feature, endpoint or screen in a React project not made from the boilerplate, built on its own code and conventions | `develop` skill, Workflow B + `codebase-explorer` agent + `scripts/verify-project.sh`; `references/outside-template.md` in each building skill | The change reuses the project's HTTP client, query layer and tests, adds no library unasked, and the project's own gates pass |
| 6 | **Watch mode:** the unit tests re-run whenever the code changes | `pnpm test:watch` (`vitest --watch`) in the boilerplate's `apps/web` | Saving a file re-runs the tests that import it, in any shell and with `CI` set |
| 7 | **CI/CD:** unit and e2e tests on every pull request and push, Storybook and the app deployed | The boilerplate's `.github/workflows/ci.yml` and Playwright in `apps/web` (`e2e/`, `playwright.config.ts`); `feature-development` writes the specs | A new project carries the workflow; `pnpm check` runs the e2e specs as its sixth gate; every feature adds `e2e/<name>.spec.ts`, and `verify.sh` runs the quoted one |
| 8 | **Netlify:** deploy, run the e2e tests on the deploy, then publish | The boilerplate's `apps/web/netlify.toml` + the workflow's deploy-draft, e2e-deployed and deploy-production jobs | A draft deploy per pull request (`pr-<n>`); production only after the same specs pass against the draft URL |
| + | Not in the assignment: build a UI that matches a design (screenshot, mockup, Figma, DESIGN.md; all optional) | `ui-development` skill | Theme tokens, shadcn components and the four data states, no raw colors |

### Each skill must

- Trigger from the words a developer would type ("Scaffold a new web app", "Implement this
  ticket", "Add PATCH /todos/:id", "Make it look like this screenshot"), and not trigger on
  requests that belong to another skill.
- Copy every code example from the boilerplate's `apps/web` or the verified worked feature, never from memory.
- Run `pnpm check` (all six gates; lint includes a Prettier check, e2e runs Playwright) before reporting done; in a
  project not made from the boilerplate, `scripts/verify-project.sh`, which runs the gates the
  project has and names the ones it lacks.
- End with a `## Result` block: Did / Saw / Not done / Blocked by / Next.
- Exclude an acceptance criterion that depends on an unanswered question (data, a business rule,
  what the backend must agree with), and name it in the report instead of guessing. A detail the
  ticket leaves out that only changes presentation gets the simplest default, listed under
  **Next** for the user to confirm. When the ticket states the rule and leaves only its edges
  open (inclusive bounds, from today or tomorrow), the skill builds the literal reading, tests it
  and asks under **Next**. The one exception is a whole app from one message (`develop`,
  Workflow A): there the plan answers every open question with a default listed under
  Assumptions, and every criterion stays in scope.

### The generated app must

- Call the backend only through `ApiClient` (lint rejects `fetch` in any form, `XMLHttpRequest`
  and `axios`).
- Render four distinct states on every data screen: loading, error with retry, empty, success.
- Show server validation errors (422) next to the matching form fields.
- Mock every request with MSW in tests; an unhandled request fails the test.
- Keep at least 80% line coverage in `src/features/**` and `src/lib/**`.
- Walk each feature's main flow in a Playwright spec that passes on the mock build locally and
  on the Netlify deploy in CI.

## Proof of concept

Requirement 4, one message to a whole app: the demo in `README.md` ("Demo") gives
`/web-dev:develop` one sentence about a library manager in an empty folder. Its output,
`examples/library-manager/`, is demo output kept locally, not in the repository.

## Out of scope

- SSR and Next.js, backend code, and writing or changing CI/CD pipelines: the boilerplate brings
  its own (requirements 7 and 8), and the skills leave it as it is.
- Applying the skeleton to an existing project: `create-project.sh` refuses a folder with
  conflicting files. An existing project gets features through Workflow B instead.
- Not yet: bug fixes, review without edits, commits, PR/MR and CI work (`develop` reports them as
  not covered and changes nothing), and projects that are not React or use Next.js / SSR.

## Distribution

The skills ship as the Claude Code plugin `web-dev`, listed by the marketplace at the
repository root. Install steps are in [`web-dev/README.md`](web-dev/README.md#install).
Eight third-party companion skills (shadcn, React Router, Vite, Vitest, React performance,
composition, React Hook Form, React Testing) are installed next to them, pinned to audited
commits.
