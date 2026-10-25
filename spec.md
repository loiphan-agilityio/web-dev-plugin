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
| 1 | **Code skeleton:** create a working project (providers, Effect runtime, query client, path alias, lint, tests) from the react-vite-boilerplate monorepo: a landing page, or a web app with or without its authentication feature, as the user chooses | `project-setup` skill + `scripts/create-project.sh` (runs the boilerplate's own generator) | All three variants are created, wired and refused as `tools/check-create-project.sh` expects (run by `verify.sh`); the generated project passes the boilerplate's `pnpm check` |
| 2 | **Develop feature:** ticket → tested UI (schema, API layer, queries/mutations, form, UI, tests) | `feature-development` skill + a worked todos feature in its `references/` | A ticket becomes a page with the four data states, a test file and a story per component, and `pnpm check` passes |
| 3 | **Integrate API:** Effect Schema + HttpClient with typed errors, `queryOptions` / mutations, MSW mocks | `api-integration` skill + `ApiClient`, `runEffect`, `ApiError` in the boilerplate's `apps/web` | Every backend failure maps to one of 7 typed `ApiError` cases; 404, 422 and 500 paths are tested |
| 4 | **One message, whole app:** a description on any topic becomes a running POC without further input | `develop` skill, Workflow A: plans `docs/plan.md`, then drives `project-setup`, `feature-development` and `ui-development`, runs the gates and opens the app on mocks | One prompt yields a scaffold, every planned feature, six green gates and an app that runs with `pnpm dev:mock`; every decision made for the user is listed |
| 5 | **Existing project:** a feature, endpoint or screen in a React project not made from the boilerplate, built on its own code and conventions | `develop` skill, Workflow B + `codebase-explorer` agent + `scripts/verify-project.sh`; `references/outside-template.md` in each building skill | The change reuses the project's HTTP client, query layer and tests, adds no library unasked, and the project's own gates pass |
| 6 | **Watch mode:** the unit tests re-run whenever the code changes | `pnpm test:watch` (`vitest --watch`) in the boilerplate's `apps/web` | Saving a file re-runs the tests that import it, in any shell and with `CI` set |
| 7 | **CI/CD:** unit and e2e tests on every pull request and push, Storybook and the app deployed | The boilerplate's `.github/workflows/ci.yml` and Playwright in `apps/web` (`e2e/`, `playwright.config.ts`); `feature-development` writes the specs | A new project carries the workflow; `pnpm check` runs the e2e specs as its sixth gate; every feature adds `e2e/<name>.spec.ts`, and `verify.sh` runs the quoted one |
| 8 | **Netlify:** deploy, run the e2e tests on the deploy, then publish | The boilerplate's `apps/web/netlify.toml` + the workflow's deploy-draft, e2e-deployed and deploy-production jobs | A draft deploy per pull request (`pr-<n>`); production only after the same specs pass against the draft URL |
| 9 | **Landing page or web app:** `project-setup` asks which, and a landing page comes complete (favicon and icons, manifest, title, description, Open Graph, `robots.txt`, `sitemap.xml`) | `project-setup` + `create-project.sh --landing` (the boilerplate's `create/templates/landing`) | `check-create-project.sh` creates all three variants; a landing project passes `pnpm check:report` |
| 10 | **Landing quality:** accessibility, axe, Lighthouse and PageSpeed before launch | The boilerplate's `e2e/accessibility.spec.ts` and CI `lighthouse` job (`tools/lighthouse.mjs`); web-quality's `audit` landing checklist and `scripts/pagespeed.mjs` | axe finds 0 violations; Lighthouse accessibility 100 and SEO ≥ 95 or CI fails |
| 11 | **Output checklist:** unit pass rate (%), coverage, build, lint, e2e pass rate | The boilerplate's `pnpm check:report` (`tools/check-report.mjs`), in CI's run summary; `project-setup` and `feature-development` put it in their Result | A failing test shows as `FAIL: 97.5% (39/40 passed)` and exit 1 |
| 12 | **Protected branches:** no push to dev, staging or production | The boilerplate's `.husky/pre-push` | A push to `dev`, `stag`, `prod` (and long names, `main`) is refused; a feature branch passes |
| 13 | **Ticket contracts:** `/web-dev:ticket <id>` writes `docs/tickets/<id>/intent.md`, `spec.md`, `plan.md` and commits them for review | `ticket` skill + `scripts/check-contract.mjs`; `feature-development` builds from the contract | `check-contract.mjs` passes: every section filled, every `AC-<n>` cited by a `T<n>` task (`scripts/test/`) |
| 14 | **Tickets in parallel:** several tickets written at once | `ticket` skill: one subagent per ticket, each writing only its folder | Every folder passes `check-contract.mjs` |
| 15 | **Incident contracts:** `/web-dev:incident <id>` writes `docs/incidents/<id>/report.md`, `rca.md`, `actions.md` | `incident` skill + `scripts/check-contract.mjs` | Status is open, mitigated or resolved; follow-ups `A<n>` listed |
| 16 | **Anti-slop for TypeScript:** no `as any`, hand-written `_tag` checks or unexplained casts | The boilerplate's anti-slop Oxlint plugins (`tools/oxlint/anti-slop`, `pnpm lint`), and the quoted todos feature that `verify.sh` lints | `pnpm lint` passes with 0 anti-slop errors |
| 17 | **PR contracts:** `/web-dev:pr` opens a pull or merge request described by why, what changed, the ticket contract it implements and the `pnpm check:report` checklist; it is not opened ready into a protected branch before CI passes | `pr` skill + `scripts/check-contract.mjs` (a description file) | `check-contract.mjs` passes: four sections filled, linked contracts pass, every gate passes (`scripts/test/`); the PR stays a draft while CI fails |
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
- Not yet: bug fixes, review without edits, and commits beyond the contract commit of `ticket` and
  `incident` (`develop` reports them as not covered and changes nothing); a PR or MR goes through
  `pr`, which never merges.

## Distribution

The skills ship as the Claude Code plugin `web-dev`, listed by the marketplace at the
repository root. Install steps are in [`web-dev/README.md`](web-dev/README.md#install).
Eight third-party companion skills (shadcn, React Router, Vite, Vitest, React performance,
composition, React Hook Form, React Testing) are installed next to them, pinned to audited
commits.
