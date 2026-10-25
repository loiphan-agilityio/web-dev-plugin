# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and is tagged `web-dev--v<version>`.
A git install is a cached copy, so a change reaches users only with a new version.

## 0.5.5

- The boilerplate is pinned at `8cdfd3e`: `pnpm check:report` removes the temp folder it
  writes the vitest and e2e JSON to (each run left a `check-report-*` folder behind).
- Restored the 0.5.3 heading this changelog lost in 0.5.4.

## 0.5.4

A clean-up of redundant, unneeded and drifted text and code, over eight audit passes until one
found nothing left; each change was checked against the code or the pinned boilerplate.

- Fixed what had drifted: `feature-development` said `pnpm test:watch` needs `--filter web` at the
  root (the root has it); `effect-http.md` described `HttpClient.mapRequestEffect`, gone from the
  client; `companions.md` used the two-argument `setFormErrors`; `errors.md` said every
  `ServerError` is retried (a 5xx only); `design-mapping.md` named `components/ui`; `plan.md`'s
  example broke the "Authentication: yes/no" rule; four relative links did not resolve.
- `create-project.sh` always passes `--name` and the kind (no fallbacks for a generator the pin
  rules out); `detect-project.mjs` outputs only what something reads (no `markers`,
  `missingGates`).
- Rules live in one place: references point to `stack-guidelines.md`, `architecture.md` and
  `msw.md` instead of restating them; the notes for the untagged 0.1.0 template are gone; the
  README's maintainer section points to the repository's `CLAUDE.md`.
- The boilerplate is pinned at `4c7b41a` (its `run.ts` no longer suggests branching on `_tag`).

## 0.5.3

Fixes from an audit, each reproduced before the change:

- `install-companions.sh` fails when a companion is not installed. The boilerplate ships
  skills-lock.json with all eight entries, so the lock check passed with nothing installed; each
  companion must now also have its SKILL.md, by name, in `.claude/skills/`.
- `feature-development` ends with `pnpm -w check:report` in a project from the boilerplate
  (`check:report` exists only at the root; `-w` runs it there from `apps/web`) and puts the
  checklist in its Result; `ticket`'s plans name the same command.
- Docs match the code: a project starts at the pinned commit, not `main`; setup runs
  `check:report`; the `findBy*` timeout is 5 s; skill and script counts; `CardTitle` example.
- The boilerplate is pinned at `1fa4708` (anti-slop in apps/web's lint, the CSP for an http API,
  check-report's reports); `references/coding-standards.md` synced.

## 0.5.2

- Removed the eval cases added in 0.4.0 (22 setup-landing, 23 ticket-contracts-parallel, 24
  incident-record) and the Evals workflow's sandbox step from 0.5.1, at the maintainer's request;
  the earlier cases and workflow are unchanged (maintainers only).

## 0.5.1

- The Evals workflow installs the shell sandbox `claude plugin eval` requires (bubblewrap and
  socat, with Ubuntu 24.04's user-namespace restriction lifted) and checks that it runs. Without it
  every case is refused before the model runs, as a run on Windows showed (maintainers only).

## 0.5.0

- **The boilerplate is pinned to a commit.** `create-project.sh` fetches react-vite-boilerplate at
  the commit this release was verified against (`pinned=`, now `56740b5`) instead of its `main`,
  so a plugin version always creates the project its skills quote, however the boilerplate moves.
  `BOILERPLATE_REF` picks another commit, branch or tag (`main` for the latest);
  `BOILERPLATE_REPO` without a ref uses that repository's checked-out branch, as before. CI's
  weekly run tries the boilerplate's `main` to show drift before the pin moves (maintainers).
- `references/architecture.md` (synced): unexpected errors are reported in one place, the
  boilerplate's `reportError` (`src/lib/report-error.ts`): a 5xx or an `InvalidResponseError`
  from any query or mutation, and a route that throws. A feature never logs or reports an API
  error itself.

## 0.4.1

Fixes, found by writing a real contract with the `ticket` skill:

- `check-contract.mjs` ignores what HTML comments hold: the templates' example items
  (`- [ ] AC-1 ...` inside a fill comment) passed the criteria, tasks and traceability checks of a
  contract nobody had filled.
- `check-contract.mjs` counts a criterion as planned only when a task line cites it; a mention in
  the Tests section alone passed.
- `testing.md` says the boilerplate's root has `pnpm test:watch` (it said the root had none).

## 0.4.0

New:

- `ticket` (`/web-dev:ticket <id> ...`): writes the contract of a ticket in
  `docs/tickets/<id>/`: `intent.md` (the problem, users, outcome, non-goals, source), `spec.md`
  (testable `AC-<n>` criteria, data, API, UI states, open questions) and `plan.md` (`T<n>` tasks
  citing the criteria, files, tests, gates, risks), grounded in the project's code. It commits them
  on a branch for review and pushes only when asked. Several tickets are written in parallel, one
  subagent each, each writing only its own folder.
- `incident` (`/web-dev:incident <id>`): writes `docs/incidents/<id>/report.md`, `rca.md` (each
  claim measured or hypothesis) and `actions.md` (follow-ups `A<n>` that can become tickets),
  blameless, and commits them the same way.
- `scripts/check-contract.mjs`: checks either contract (every section, no template marker left,
  every criterion cited by a task, an incident status and follow-ups), JSON out; tested in
  `scripts/test/` against the shipped templates too.
- `project-setup` asks whether to build a landing page or a web app (`create-project.sh
  --landing`, needs react-vite-boilerplate with `create/templates/landing`): one public
  marketing page with its icons, manifest, Open Graph tags, `robots.txt` and `sitemap.xml`, built
  and tested without mocks, with no authentication question.
- `develop` routes landing pages, ticket contracts and incidents.

Changed:

- `project-setup` runs `pnpm check:report` (react-vite-boilerplate's checklist of every gate with
  the unit and e2e pass rates and coverage) and puts its table in the Result.
- `feature-development` builds from `docs/tickets/<id>/` when the contract exists: its criteria,
  in its task order, ticking each item, and re-checks the contract at the end.
- The quoted todos feature and the error guidance pass the boilerplate's anti-slop rules: branch
  on `instanceof` or `Match.tagsExhaustive`, never on `_tag` by hand; `references/` synced.
- Evals 22 to 24 cover the new routes (maintainers only; not run).

## 0.3.3

Fixes, each reproduced before the change (the bash 3.2 one by reading the code: no bash 3.2 on
the machine that made it):

- `detect-project.mjs` finds the package manager of a package inside a pnpm or yarn workspace:
  it walks up to the workspace root (`pnpm-workspace.yaml`, or a `package.json` with
  `workspaces`) for the first `packageManager` field or lockfile, where it reported `npm`.
  Outside a workspace only the folder itself counts.
- `detect-project.mjs` reads pnpm catalogs past a column-0 comment, in the `catalogs: default:`
  form and as named catalogs (`catalog:<name>`); a catalog version it still cannot resolve is
  left out of `otherMajors` instead of reported as `catalog:<name>`.
- `develop`: detect's exit 2 for a path that is a file ("is not a folder") is reported with a
  question, no longer a folder to create. Workflow B reports `verify-project.sh` exit 2 (nothing
  was verified) under **Not done**, never as passed.
- `verify-project.sh` runs on bash 3.2 (macOS) when `package.json` has no scripts; `set -u`
  aborted on the empty array.
- `install-companions.sh` fails unless `skills-lock.json` records each companion at its pinned
  commit and path; it only checked that the file existed, which a project from the boilerplate
  always does.
- `project-setup` names the project after its target folder: `create-project.sh` passes
  `--name` to the boilerplate's generator, which runs in a temporary folder (needs
  react-vite-boilerplate with `create --name`; an older generator is called as before).
- Forms pass `form.getValues()` to `setFormErrors`, so a server message for a name the form has
  no input for shows above the submit button (react-vite-boilerplate's three-argument
  `setFormErrors`; `forms.md` says to drop it on an older boilerplate).
- `README.md` pins the current release, `#web-dev--v0.3.3`, in the install example.
- Eval 13 no longer scores whether `develop` fired: on a one-arm run the grader counted, so a
  correct run scored 0.67 against the 0.66 threshold (maintainers only).
- `evals/run.sh` runs on bash 3.2 when both `--max-cost-usd` and `--ablation` are given
  (maintainers only).
- `DESIGN.md` names `packages/ui` for the shadcn components and theme, and two registration
  files per feature (maintainers only).
- `pnpm lint` runs `tools/lint.sh` with bash: through cmd.exe on Windows its loop failed
  (maintainers only).

## 0.3.2

Fixes, each reproduced before the change:

- At the monorepo root (`develop`'s Workflow A), the app's own commands take `--filter web`:
  one test file (`pnpm --filter web test <path> --coverage.enabled=false`), `test:watch` and
  `exec shadcn add`, which the root's turbo scripts rejected or lacked. Effect's guide is
  `apps/web/node_modules/effect/AGENTS.md` there. `allowed-tools` cover the new forms.
- Workflow A in a folder that already holds other files builds in `<app-name>/` and now runs
  `cd <app-name>` before the gates (each A3 subagent too); its gates and dev server ran where pnpm
  found no `package.json`. The dev server in `.claude/launch.json` takes `--dir <app-name>`.
- Eval 15 fails a run that changes the pipeline the fixture ships, through Edit, Write or the
  shell; it only caught new pipeline files.
- `tools/verify.sh` passes native paths to the format hook on Windows (maintainers only).
- `api-integration` (`effect-http.md`, Auth) describes the boilerplate's new 401 hook,
  `AuthToken.fromGetter(get, onRejected)`, which the auth variant wires as
  `fromGetter(tokenStore.get, tokenStore.reject)` (react-vite-boilerplate#3); the one-argument
  form still works on an older boilerplate.

## 0.3.1

Fixes, each reproduced before the change:

- `detect-project.mjs` resolves `catalog:` versions from `pnpm-workspace.yaml`, so a project fresh
  from the boilerplate no longer reports react, typescript and tailwindcss on another major; a
  path that is a file exits 2 ("is not a folder") instead of 1, the broken-JSON code.
- `verify-project.sh` exits 2 when the project has no gate script, instead of 0 with nothing run.
- Evals 05, 06, 11 and 12: the no-scaffold graders match `create-project.sh`; they matched the
  removed `scaffold.sh` and could never fail.
- `feature-development`: running one test file passes `--coverage.enabled=false`, since the 80%
  threshold fails a single file whose tests pass.
- `ui-development`: at the monorepo root, the visual check's dev server runs with
  `--filter web`; `pnpm dev:mock --port ...` there stopped at turbo's `unexpected argument`.

## 0.3.0

Needs the react-vite-boilerplate with Playwright, `build:mock` and its CI/CD (the boilerplate's
`feat/playwright-netlify-ci`): release it after that is merged.

- **End-to-end tests:** `feature-development` writes `e2e/<name>.spec.ts` per feature, the main
  flow in a real browser on the mock build, quoted from `references/testing.md` (todos opens
  `/todos`; with authentication it signs in first). `project-setup` runs
  `pnpm test:e2e:install` before `pnpm check`, and every building skill installs Chromium when the
  e2e gate reports it missing. `pnpm test:watch` is named for the inner loop.
- **CI/CD lives in the boilerplate:** its `.github/workflows/ci.yml` and `apps/web/netlify.toml`
  run checks and e2e, a Netlify draft deploy with the e2e specs against it, then production, and
  link each deploy from the checks list. The plugin writes none of it, and `develop` still
  answers CI/CD work with "not yet".
- `tools/verify.sh` installs Chromium and runs all six gates, the quoted e2e spec included;
  `BOILERPLATE_REPO` points it at a boilerplate branch before it is merged.
- **Plugin CI on GitHub Actions**, the jobs of `.gitlab-ci.yml` in three workflows: `ci.yml`
  (manifests, skills spec, `verify.sh`), `companions.yml` (weekly) and `evals.yml` (the
  model evals, only from a manual run on a release tag, after `ci.yml` passes).

## 0.2.0

- **`project-setup` creates the project from the react-vite-boilerplate** instead of copying
  `assets/app-template/`: `scripts/create-project.sh <dir> --auth|--no-auth` clones the boilerplate
  and runs its own generator (`create/index.js`), so a new project is a pnpm + Turborepo monorepo
  with the app in `apps/web`. The skill asks whether to include authentication (email + password
  sign-in, `protectedRoutes()`, MSW mocks) unless the request says; Workflow A takes it from the
  plan and builds the features in `apps/web`. It refuses a folder with any of the project's files,
  and keeps an existing `.claude/settings.json` (the boilerplate brings one at its root and one in
  `apps/web`, since Claude Code reads it only where a session starts).
  `tools/check-create-project.sh` (run by `verify.sh`) checks both variants; eval
  `19-setup-asks-for-auth`. The plugin no longer ships a template: `assets/app-template/` and
  `scaffold.sh` are gone, the eval fixtures create their project from the boilerplate (the cases
  name `apps/web`), `ui-development` edits the theme in `packages/ui/src/styles/globals.css`, and
  `references/` mirror the boilerplate's `apps/web/CLAUDE.md`.
- `tools/verify.sh` replaces `verify-template.sh`: it runs the todos feature the skills quote in a
  project created from the boilerplate, where Claude copies it, instead of in the template. The
  quoted code imports the boilerplate's UI kit (`@repo/ui/components/*`, `cn` from
  `@repo/ui/lib/utils`), and the wiring is two edits (routes, mock handlers): the boilerplate's
  root layout has no nav, and with authentication the route goes inside `protectedRoutes([...])`.

## 0.1.0

The first release.

- **One entry point**, `/web-dev:develop <request>`: `detect-project.mjs` sorts the folder into a
  tier and the request into a kind, then runs Workflow A (a whole app from one description:
  `docs/plan.md`, the scaffold, each ticket in its own subagent, gates, the app on mocks),
  Workflow B (an existing React project, mapped by the `codebase-explorer` agent and checked by
  `verify-project.sh`) or Workflow C (one change in an app from the template).
- **Four skills** behind it: `project-setup`, `feature-development`, `api-integration`,
  `ui-development`. Each component they write is a folder: `<Name>/index.tsx`, its
  `<Name>.stories.tsx`, its `__tests__/` and the files only it uses (`types.ts`, `utils.ts`).
- **The template** (React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query 5, React Hook Form 7,
  shadcn/ui): `ApiClient` with typed errors, reading `apiUrl` from `AppConfig` and the bearer
  token from `AuthToken` (none by default; `AuthToken.fromGetter` for sign-in); five gates (lint,
  typecheck, tests with coverage, build, Storybook build); husky, commitlint and lint-staged; a
  Prettier hook on every file Claude writes.
- **No permission prompts in a run.** Each skill lists the commands it runs in `allowed-tools` and
  calls the plugin's scripts by their `${CLAUDE_SKILL_DIR}` path, so one message runs to the end,
  in an untrusted folder and in `claude -p` too.
- **Install from the git host**: `claude plugin marketplace add <repo-url>#<ref>`.
- **Evals** (`evals/`): routing cases with fixtures, and two end-to-end cases (a feature, a whole
  app). They cost credits, so they run only when the maintainer asks; `evals/run.sh` refuses
  single cases, unfinished work and content already evaluated. `tools/validate-skills.sh` checks
  every skill and parses every eval case for free.
