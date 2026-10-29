# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and is tagged `web-dev--v<version>`.
A git install is a cached copy, so a change reaches users only with a new version.

## 0.10.2

- `deploy-setup` no longer takes "done" on trust once the user has stored the Cloudflare API
  token: it checks that GitHub lists `CLOUDFLARE_API_TOKEN` updated after the hand-over
  (`gh secret list`, or the secrets page in Chrome), and hands over again when it does not. With
  the secret and the variables set, it reruns the last push run on `main` (the whole pipeline,
  production and e2e included; a manual `workflow_dispatch` run when there is none, which deploys
  only the preview), waits for it in the background with `gh run watch`, reports each job, and
  gives the user the run's URL and the links the run wrote (the commit statuses for production,
  preview and coverage, the Allure report's annotation). A failed job is reported with its cause
  (a token without Cloudflare Pages Edit sends the user back to the token) and rerun with
  `--failed` once it is fixed.

## 0.10.1

- `project-setup` reads the rules on the GitHub repository's `main` right after `git remote add`
  (`gh api repos/<owner>/<repo>/rules/branches/main`, read-only), since a ruleset can exist while
  the repository is still empty: one that refuses every push to `main` and that the user cannot
  bypass is named before anything is created, with the commands to lift it and turn it back on,
  and the user picks lifted or push later. A push refused with `GH013` keeps the commits local and
  goes under **Blocked by** with the same commands; the skill never changes a ruleset itself.
- `deploy-setup` pushes `main` to an `origin` that has none (an empty repository) and applies the
  `main` ruleset only once `main` is on GitHub: applied first, it refused the push that creates
  `main`, so nothing could reach it again.

## 0.10.0

- `project-setup` puts the target on git before it creates the project (step 3): with no
  repository it runs `git init -b main` without asking, and "no git for now" is no longer offered,
  so the first commit and the hooks always come with the project. The branch is always `main`:
  never a plain `git init` (`master` where `init.defaultBranch` is unset), and a target whose
  `.git/` is on another branch has it renamed to `main` (asking first when it has commits). It
  asks first:
  the identity the commits carry, always, even when git already has one (the `user.name` /
  `user.email` found, confirmed by the user, or another pair asked for and set local to the
  repository, never `--global`), the GitHub or GitLab repository URL (kept as given, SSH
  host aliases included), and whether to push. It runs `git init -b main`, the identity and
  `git remote add origin`, then checks the repository for `main` (`git ls-remote`): an existing
  `main` is pulled only after the user confirms that the project replaces its files; an empty
  repository gets a `README.md` with `Hello World` committed as `main`, and pushed only when the
  user chose to push. `create-project.sh --replace` replaces
  the files git tracks (outside `.claude/`), refusing a dirty working tree and untracked files in
  the way. After the gates (step 8) it turns the hooks on, commits the scaffold and, only when every gate
  passed, pushes `main` with `PROTECTED_BRANCHES=none`, since the project's `pre-push` hook
  refuses `main`; never `--no-verify` or `--force`. A red gate leaves the commit local and the
  push under **Not done**. The hand-over and the Result no longer suggest `git init` or the
  hooks inside a parent repository, and a fifth question (`Branch`) goes in a second call, since
  `AskUserQuestion` takes four.
- `deploy-setup` no longer stops at step 5 when `gh` is signed out or `origin` is missing: each
  side (GitHub, Cloudflare) uses its CLI when installed and signed in, else Claude in Chrome in the
  user's browser; a project without `origin` gets its GitHub repository first. It creates all four
  Pages projects (app, Storybook, coverage, Allure report) after one question, and a failing gate
  no longer skips the deploy setup. The user still creates and pastes the API token; with Chrome,
  Claude fills the forms up to that point and reads nothing while the token is on screen.

## 0.9.2

- `project-setup` looks for `.git/` in the target and its parents before offering git: it offers
  `git init` and a first commit only when there is no repository, offers just the commit when the
  target already has `.git/` (kept by `create-project.sh`), and never nests a repository inside a
  parent one (it says which repository holds the project and skips `pnpm run prepare`, since
  husky installs hooks only at a repository's root). A declined offer goes under **Not done**,
  the hand-over lists the commands to run later, and **Did** reports the git state.

## 0.9.1

- The boilerplate pin moves to `ace5470`: its CI adds `X-Robots-Tag: noindex` to the `/*` block
  of a preview's `_headers` instead of appending a second `/*` block, which Pages applied in place
  of the first, so previews had lost `X-Frame-Options` and `Permissions-Policy`. `deploy-setup`
  brings the fixed workflow into a project.

## 0.9.0

- A new skill, `deploy-setup`, sets up CI/CD in a project created from the boilerplate: its
  `scripts/sync-pipeline.mjs` creates a reference project of the same kind at the pin and brings
  the project's workflow, ruleset, Playwright and Allure configs, `_headers`, CI tools, the root
  `CLAUDE.md`'s CI/CD section, the pipeline's `package.json` entries and `.gitignore` lines to it,
  removes `netlify.toml`, and lists the other lines that still name Netlify with the boilerplate's
  wording. It refuses to replace a file git cannot restore. The skill then runs every gate and,
  asking before each command, creates the Cloudflare Pages projects, sets the GitHub variables
  and the ruleset; the user sets the API token secret. `develop` routes a **ci** request in a
  `template` or `landing` project to it (CI/CD elsewhere stays "not yet"); eval case 15 now expects
  that route, case 20 the refusal in another stack. `tools/check-sync-pipeline.sh`, run by
  `verify.sh`, checks the script against projects from the last Netlify commit.
- The boilerplate pin moves to `8c19b5a`: the app and Storybook deploy to Cloudflare Pages instead
  of Netlify (`apps/web/public/_headers` and `public/assets/404.html` replace `netlify.toml`), the
  one e2e run is against production after its deploy, and the coverage and Allure reports are
  published on Pages. `project-setup`, `feature-development` and its `testing.md` say so.
- `detect-project.mjs` has a `landing` tier: a landing page from the boilerplate (its UI kit and
  test helpers, no API layer or Effect), which since the pin below it no longer reads as
  `template`. `develop` sends a landing or ui change there to `ui-development`, and anything that
  needs data to Workflow B, which asks before adding a library; a setup request finds it already
  set up. `check-detect.sh` checks it and two near misses; eval case 16 covers the route.
- The boilerplate pin moves to `4699948`: Oxlint is its only linter (no ESLint), a landing page
  has no API layer or mocks, lint runs each file once, and e2e runs write an Allure report.
  `references/` follow (`sync-references.sh`): a query key holds every value its `queryFn` reads,
  since no lint rule checks it any more. The README, `forms.md` and `project-setup` name Oxlint's
  rules instead of ESLint's.
- `incident` names its three templates (`references/report.md`, `rca.md`, `actions.md`), which its
  steps never pointed to, and `ticket` gives the full path of each of its three. skill-validator
  reported them as files no skill text named.
- `tools/validate-skills.sh` also runs skill-validator 1.8.0's `check --strict` on both plugins'
  skills (CI downloads its release binary and checks it by SHA-256), so `tools/run-evals.sh` runs
  it before any eval.
- The model evals run only locally: `.github/workflows/evals.yml` and its `ANTHROPIC_API_KEY` are
  gone. `evals/run.sh` now goes through `tools/run-evals.sh`, which also refuses a HEAD that is
  not the release commit (`web-dev--v<version>`) and runs `pnpm lint` and `validate-skills.sh`
  before `verify.sh`, so evals come last, on a finished release.
- Workflow A makes the first ticket's list page the app's home: it is the index route, so `/`
  opens it instead of the boilerplate's welcome page (which read like a landing page, with
  nothing linking to the features), and `src/app/root-layout.tsx` gets a nav with a link per
  page. The welcome page, its assets and test go; `e2e/home.spec.ts` expects the list.
- `verify-project.sh` prints its checklist as aligned text, which reads in a terminal, instead of
  a Markdown table: a mark per gate (`✔` pass, `✘` fail, `–` no script), the gate, what was
  measured (`97.5% (39/40 passed)`) and the time, in padded columns.

## 0.8.0

- Every result ends with the output checklist: each gate's status, the unit tests' pass rate (%),
  build and lint. `verify-project.sh` (Workflow B, a project not made from the boilerplate) prints
  it in the shape of `pnpm check:report`: a `| Gate | Status | Result | Time |` row for lint,
  typecheck, unit tests (`97.5% (39/40 passed)`, read from Vitest's, Jest's or Mocha's summary,
  summed over a monorepo's packages, prefixed lines included) and build, a `missing` row for each
  gate the project has no script for, and `All N gates pass.` or the failing gates. A project with
  its own `check` still runs only that, as one Check row with the pass rate read from its output.
- `api-integration`, `ui-development` and `develop`'s Workflow A run `pnpm -w check:report`
  (`pnpm check:report` at the root) in a project from the boilerplate and put its checklist in
  their Result, as `project-setup` and `feature-development` already did.

## 0.7.1

- `project-setup` asks the kind (landing page or web app with authentication) with the
  `AskUserQuestion` tool, as a choice in the terminal, and falls back to text only when that tool
  is not available (a headless run): 0.7.0 could print it as text.

## 0.7.0

- A web app always has authentication. `project-setup` asks one question, a landing page or a web
  app with authentication, instead of the kind and then authentication; `develop`'s Workflow A
  always creates a web app, and its plan no longer has an "Authentication" assumption.
  `create-project.sh` takes `--auth` or `--landing` and refuses `--no-auth`.
- The todos feature the skills quote is wired for a web app with authentication: its route sits
  inside `protectedRoutes([...])`, its handlers after `createAuthHandlers()`, its page test sets
  the mock token and its e2e spec signs in. `verify.sh`, `sync-references.sh` and the eval
  fixtures create their projects with `--auth`, and `references/architecture.md` gains the Auth
  paragraph of the boilerplate's `apps/web/CLAUDE.md`.
- Eval case 17 is now `17-setup-asks-for-kind`, and `03-setup-only` expects `--auth`.
- Dropped the `allowed-tools` rules the skills never use: `pnpm typecheck` (`api-integration`,
  `feature-development`, `ui-development`), `node --version` and `pnpm install` (`develop`),
  `mkdir -p *` (`ticket`, `incident`: they write with the Write tool), and four formatter forms
  `feature-development` does not name (`pnpm format`, `npm run lint:fix`, `yarn lint:fix`,
  `bun run format`).
- The "Gates" bullet of `api-integration` and `ui-development`'s `outside-template.md` is shorter.
- Renumbered eval cases 19, 20 and 21 to 17, 18 and 19, leaving 16 free.

## 0.6.1

- `pr` writes the PR description to `pr-body.md` in a temporary folder outside the repository
  (`mktemp -d`) instead of the git directory: Claude Code does not write inside `.git/`, as a run
  that opened a real PR showed.

## 0.6.0

- New skill `pr` (`/web-dev:pr`): opens a pull request (`gh`) or merge request (`glab`) for the
  current branch, described by the PR contract in `skills/pr/references/pr.md`: Why, Changes,
  Ticket (a link to `docs/tickets/<id>/` and the criteria it covers, or `none: <why>`) and
  Evidence (the `pnpm check:report` checklist). It stops on a protected branch, uncommitted
  changes or a failing gate, opens the PR as a draft, waits for CI and marks it ready only when
  CI passes; it never merges.
- `check-contract.mjs <file.md>` checks a PR description: the four sections filled, the linked
  ticket contracts present and passing their own checks, every cited criterion in their spec,
  and a checklist with every gate passing.
- `develop` routes a PR or MR request to `pr`; `ticket` and `incident` point to it for the PR.

## 0.5.6

- `project-setup` turns the git hooks on with `pnpm run prepare` after `git init`: in the installed
  project, `pnpm install` found nothing to do and skipped husky, so no hook ran and a push to `dev`
  went through. It checks that `.husky/_/pre-push` exists before it says the hooks are on.
- The boilerplate is pinned at `98752d7` (its `apps/web/CLAUDE.md` says the same).

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
