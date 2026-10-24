# web-dev: Claude Code plugin for web development

One entry point, `/web-dev:develop <request>`, four skills that let Claude build web apps on
a modern React stack and follow its conventions on the first try, in a new folder or in an
existing React project, and two that write the contracts around the code: ticket specs and
incident records.

**Stack:** React 19 · Vite 8 · TypeScript 6 · Effect 4 · TanStack Query 5 · React Hook Form 7 ·
shadcn/ui (Tailwind CSS 4) · React Router 8 · Vitest 5 + React Testing Library + MSW 3 · Playwright 1.64 · Storybook 10 · pnpm 11 ·
GitHub Actions + Netlify (in the boilerplate)

| Skill | Use it for | Example prompt |
|---|---|---|
| `develop` | The entry point. Runs `scripts/detect-project.mjs`, sorts the request and picks a workflow: **A** a whole app in a new folder (plans features, data model, API and mock data in `docs/plan.md`, runs the skills below and all gates, opens the app on a mocked API; decides instead of asking), **B** a change in a React project not made from the template (maps it with the `codebase-explorer` agent, builds on its own code, runs its own gates with `scripts/verify-project.sh`), **C** one feature, endpoint or screen in an app from the template | "/web-dev:develop Build an employee management app with CRUD, search and forms" · "/web-dev:develop Add a department filter to the employees list" |
| `project-setup` | A new project from the react-vite-boilerplate (pnpm + Turborepo monorepo, the app in `apps/web`): asks whether it is a landing page or a web app, and for a web app whether to include authentication (email + password sign-in, protected routes, MSW mocks), creates it with the boilerplate's generator (`scripts/create-project.sh`), installs, adds companion skills, runs all gates | "Scaffold a new web app called billing-portal, with login" |
| `feature-development` | A ticket → schemas, API calls, queries, form, the four UI states, routes, a unit test file and a story file per component. Loads `api-integration` for endpoints beyond list + create and `ui-development` for a design | "Implement this ticket: <paste or issue URL>" |
| `ticket` | Tickets → `docs/tickets/<id>/intent.md`, `spec.md` (testable `AC-<n>` criteria, open questions) and `plan.md` (`T<n>` tasks citing them), grounded in the code, checked by `scripts/check-contract.mjs` and committed on a branch for review; several tickets in parallel, one subagent each. `feature-development` then builds from the folder | "/web-dev:ticket 412 413 414" · "Write the contract for issue #412" |
| `incident` | An incident → `docs/incidents/<id>/report.md`, `rca.md` (claims labelled measured or hypothesis) and `actions.md` (follow-ups `A<n>`), checked and committed on a branch; follow-ups can become tickets | "/web-dev:incident INC-12: login returned 500 after the 09:00 deploy" |
| `api-integration` | One endpoint: schema, `ApiClient` call, query or mutation, MSW mocks, error tests | "Add PATCH /todos/:id to toggle completion" |
| `ui-development` | A design (screenshot, mockup, Figma frame, DESIGN.md) → a UI that matches it: theme tokens, shadcn components, states, tests, a visual check in the browser. With no design it asks once for an optional DESIGN.md or Figma link, then uses the current theme | "Make the settings page look like design/settings.png" |

Out of scope: SSR / Next.js, non-React projects, backend code, CI/CD (it comes with the
boilerplate). Not yet: bug fixes, review without edits, commits and PR/MR beyond the contract commit
of `ticket` and `incident` (`develop` says so and changes nothing).

## Install

Requirements: Node ≥ 22.22, pnpm 10 or newer (it switches to the pinned pnpm 11.17 by itself), Claude Code.

**As a plugin, for a team (recommended).** The repository root is a marketplace
(`.claude-plugin/marketplace.json`) that lists this folder as the plugin `web-dev`. Add it
straight from its git host, with no clone, and the skills load in every project:

```bash
claude plugin marketplace add git@github.com:loiphan-agilityio/web-dev-plugin.git
```

```bash
claude plugin install web-dev@web-dev-plugin
```

The URL is the repository's git URL (`https://github.com/loiphan-agilityio/web-dev-plugin.git`
works too). It installs from the default branch, `main`; append `#<ref>` to pick another
branch or pin a release tag (`#web-dev--v0.4.1`). The clone runs with your
own git credentials and never prompts: an SSH key loaded in `ssh-agent`, or for an `https://`
URL a credential your git helper already stores.

A git install is a cached copy, so a release reaches you only when `version` in
`.claude-plugin/plugin.json` changes: run `claude plugin update web-dev@web-dev-plugin`, or turn
on auto-update once (`/plugin` → Marketplaces → web-dev-plugin → Enable auto-update). To offer
the plugin to everyone who opens one repository, run the `marketplace add` command there with
`--scope project` and commit the `.claude/settings.json` it writes; teammates who trust the
folder get the marketplace registered.

Typed, plugin skills are namespaced: start with `/web-dev:develop <request>`; Claude also picks a
skill from plain words. In an empty folder, one message builds a whole app:
`claude "/web-dev:develop Build me a library management app: books, members and loans"`, or just
the skeleton: `claude "Scaffold a new web app called billing-portal"`. Headless, in CI or a
script, the same message runs to the end with no settings file:
`claude -p "/web-dev:develop <request>" --permission-mode acceptEdits --allowedTools Skill`
(see Permissions below).

**From a clone, to work on the plugin.** `git clone <repo-url> web-dev-plugin`,
then `claude plugin marketplace add ./web-dev-plugin` and the same install. A marketplace added
from a local path is read in place: your edits load at the next session or after
`/reload-plugins`, with no version bump.

**Or copy the folders.** Copy `skills/`, `references/`, `scripts/` and `agents/` into the
project's `.claude/` (or into `~/.claude/` to have them everywhere): the skills reach the shared
files as `../../references/` and `../../scripts/`, so the four folders must stay side by side.
Then ask Claude to scaffold. `<plugin-dir>` below is the `web-dev/` folder of your clone:

```bash
mkdir billing-portal && cd billing-portal && git init
mkdir -p .claude
cp -r <plugin-dir>/{skills,references,scripts,agents} .claude/
claude "Scaffold a new web app called billing-portal"
```

`project-setup` asks whether to include authentication, creates the project from the
react-vite-boilerplate (`scripts/create-project.sh` clones it and runs its generator), runs
`pnpm install`, installs the companion skills and runs `pnpm check`. The generated root `CLAUDE.md`
and `apps/web/CLAUDE.md` hold the project conventions from then on; run the web-dev skills from
`apps/web`.

**Existing project.** Install the plugin (or copy the folders) as above and ask through
`/web-dev:develop`: it detects the project (`scripts/detect-project.mjs` prints the tier and the
reasons), and in a project not made from the boilerplate it maps the code first and builds on it.
The companion skills fit this stack; in a project on it, install them from the project root
(the script installs into the current folder):

```bash
bash <plugin-dir>/skills/project-setup/scripts/install-companions.sh
```

With copied folders, commit `.claude/` and `skills-lock.json` so everyone on the project gets
the same skills.

The skills work only together, as this plugin: each one reads the plugin's `references/`,
`scripts/` or another skill's references (its `compatibility` field says which), so installing a
single skill on its own (`npx skills add … --skill <name>`) leaves it with broken paths.

## Contributing

1. Edit a skill in `skills/<name>/` (or the boilerplate, then the skills that quote it; see
   Maintaining).
2. Try it in a scratch folder: `claude --plugin-dir <clone>/web-dev`, then `/web-dev:develop …`.
3. Run the checks from the repository root: `pnpm lint`, `bash tools/verify.sh`, and
   `bash tools/validate-skills.sh` (needs `pip install skills-ref==0.1.1`).
4. A change to routing (a description, `develop`'s tables, `detect-project.mjs`) gets an eval
   case: write it, do not run it (`evals/README.md`, When evals run).
5. Open a merge request with a Conventional Commit message; CI runs the checks again.

## What a new project gives you

A project from the boilerplate passes lint, typecheck, tests, build, Storybook build and Playwright
e2e. Its app,
`apps/web`, holds the parts every feature builds on (paths below are relative to it):

- **`ApiClient`** (`src/lib/api/client.ts`): the only way to call the backend. Effect 4
  `HttpClient`, decodes every body with an Effect Schema and maps every failure to a typed
  `ApiError` (`NetworkError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
  `ValidationError`, `ServerError`, `InvalidResponseError`). Tested in `client.test.ts`.
- **`runEffect`** (`src/lib/api/run.ts`): runs an effect for TanStack Query, passes the abort
  signal, rejects with the typed error so `query.error._tag` is safe to switch on.
- **Forms**: React Hook Form + `effectTsResolver(schema)` (`@hookform/resolvers` 6, Effect 4) +
  shadcn `Field`; `setFormErrors` puts server field errors under the right inputs.
- **MSW worker**: `public/mockServiceWorker.js` is not in the boilerplate; the `postinstall` script
  (`msw init`) writes it from the installed msw, so it always matches the msw version. `pnpm dev:mock` (Vite mode `mock`, `.env.mock`) serves the API from those handlers in any shell, Windows included.
- **Tests**: MSW 3 for every test (unhandled requests fail), `renderRoute` / `renderWithProviders`.
  Both mount the `Toaster` (with a `matchMedia` stub and a per-test reset in `setup.ts`), so a
  toast is asserted as text.
- **Storybook 10** (`.storybook/`): stories render inside `story-providers.tsx` (the same
  providers as a test) with MSW served by the app's worker; `pnpm build-storybook` is a gate.
- **Config**: `src/lib/config.ts` validates every `VITE_*` value with Effect Schema at startup;
  Effect code reads it as the `AppConfig` service, so a test can provide other values.
- **Auth hook**: `AuthToken` (`src/lib/api/auth.ts`) is where `ApiClient` gets a bearer token.
  Without authentication the app provides `AuthToken.none`; with it, `src/lib/runtime.ts`
  provides `AuthToken.fromGetter(tokenStore.get, tokenStore.reject)` from `src/features/auth`,
  which drops the token when any request gets a 401 to it. Both are tested in `client.test.ts`.
- **Permissions**, in two layers. Each skill's `allowed-tools` frontmatter approves the exact
  commands it runs, for the turn that invokes it: the plugin's scripts by their
  `${CLAUDE_SKILL_DIR}` path (`detect-project.mjs`, `create-project.sh`, `install-companions.sh`,
  `verify-project.sh`) and the pnpm gates. Claude Code applies it even in a folder that was never
  trusted, `-p` included, so one message runs to the end with no prompt and no settings file;
  file edits need `--permission-mode acceptEdits` headless. For later turns, the project's
  `.claude/settings.json` allows exactly the pnpm commands the skills run (`install`, `lint`,
  `lint:fix`, `typecheck`, `test`, `test:e2e`, `test:e2e:install`, `build`,
  `build-storybook`, `check`, `dev:mock`,
  `exec shadcn add` / `info`), and its `PostToolUse` hook (`.claude/hooks/format.mjs`) runs
  Prettier on every file Claude writes or edits inside the project, so code is formatted as it is
  written. A project from the boilerplate has two: the root's, for sessions started there
  (Workflow A), and `apps/web/.claude/settings.json`, for sessions in the app (Claude
  Code reads the file only from the folder a session starts in). `create-project.sh` copies the
  root one only when the project has none, and Claude Code applies it once the folder is trusted (open it with `claude` and accept the prompt).
  `git init` and commits stay prompts on purpose.
- **Coverage**: `pnpm test` fails below 80% lines in `src/features/**` and `src/lib/**`.
- **Guardrails in ESLint**: `no-restricted-imports` / `no-restricted-globals` reject the most
  common version mistakes (`react-router-dom`, `zod`, `axios`, `@effect/platform`, root `msw`
  helpers, `clsx`, `fetch` in any form, `XMLHttpRequest`); `pnpm lint` also runs `prettier --check`.
- **Code style in ESLint**: arrow functions only (`func-style`, `prefer-arrow-callback`; `function*` stays for Effect), destructuring, shorthand, template literals, `??` / `?.` and the rest of `typescript-eslint`'s `stylisticTypeChecked`, so code the skills write later reads like the template.

`feature-development/references/` (with `api.ts` and `mocks.ts` in `api-integration/references/`) quotes a full feature (todos: list + create form, a test file per component, 10 tests) and the
wiring diff for the two files a feature registers in.

## End-to-end tests and CI/CD (from the boilerplate)

A project from the [react-vite-boilerplate](https://github.com/loiphan-agilityio/react-vite-boilerplate)
brings them; the plugin writes no pipeline (`develop` answers CI/CD work with "not yet"):

- **End-to-end**: Playwright in `apps/web/e2e/`. `pnpm test:e2e` builds the app on mocks
  (`pnpm build:mock`) and serves it with `vite preview`; with `E2E_BASE_URL` set it tests that URL
  instead. `pnpm check` runs it as the sixth gate; `pnpm test:e2e:install` downloads Chromium once
  per machine (`project-setup` runs it). `feature-development` adds `e2e/<name>.spec.ts` for each
  feature's main flow, quoted from `references/testing.md` and run by `tools/verify.sh`.
- **Watch mode**: `pnpm test:watch` (`vitest --watch`) re-runs the tests that import a file each
  time it is saved, even where `CI` is set.
- **CI/CD** (`.github/workflows/ci.yml`, `apps/web/netlify.toml`): checks and e2e in parallel, a
  Netlify draft deploy of the builds they made (`pr-<n>` on a pull request), the same specs
  against it, then production on `main`. Each deploy adds a commit status
  (`Preview - Webapp Deployment`, `Prod - Webapp Deployment`) whose Details link opens it. It needs
  the `NETLIFY_AUTH_TOKEN` secret and the `NETLIFY_SITE_ID` variable; the boilerplate's `CLAUDE.md`
  has the setup.

## Pinned versions and why

| Package | Version | Note |
|---|---|---|
| typescript | ~6.0 | typescript-eslint 8.71 supports `<6.1`, so not 7.x yet. `baseUrl` is deprecated in 6; `paths` only. |
| eslint | 10 | ESLint 9 is end-of-life. `eslint-plugin-jsx-a11y` 6.10.2 declares `<=9` but works on 10 (checked against a file with a11y violations); allowed in `pnpm-workspace.yaml`. |
| effect | 4.0.5 | Forms use `effectTsResolver` from `@hookform/resolvers` 6, the first version built for Effect 4 (5.x supported Effect 3 only). |
| react-router | 8.5 | No `react-router-dom`. React Router mutates lazy route objects once loaded, so route trees are factories (`createRoutes()`). |
| msw | 3.0 | `http`/`HttpResponse` from `msw/http`, `delay` from `msw/utils/delay`, `onUnhandledFrame`. |
| vitest | 5.0 | `clearMocks` on by default; `vi.mock` top-level only. |
| shadcn | 4.22 | Style `radix-nova`; `cn` comes from shadcn's `cn` package. |
| storybook | 10.6 | `@storybook/react-vite` + addon-a11y. No `msw-storybook-addon`: 3.0.3 calls MSW 2's `onUnhandledRequest`, so `.storybook/preview.tsx` starts the app's own worker. Its esbuild dependency is allowed under `allowBuilds` (`esbuild: true`) in `pnpm-workspace.yaml`, because pnpm 11 blocks unreviewed install scripts. |

## Companion skills

Popular third-party skills for parts of the stack, installed next to the five
skills by `install-companions.sh` and pinned to an audited commit. Each was read in full for security
and fit; the findings are in [`docs/companion-audit.md`](docs/companion-audit.md), and what Claude
must ignore in each one is in [`references/companions.md`](references/companions.md), which every
skill reads before following a companion. When a companion disagrees with the project, the
project's `CLAUDE.md` and the five project skills win. The installer is pinned too:
`install-companions.sh` runs `skills@1.7.2`, not whatever `npx skills` serves that day.

| Skill | Source | Commit | License | What it is for |
|---|---|---|---|---|
| `shadcn` | shadcn-ui/ui (official) | `d2fba50` | MIT | Adding and composing components, `Field` forms |
| `react-router-data-mode` | remix-run/agent-skills (official) | `33578aa` | MIT | Routing and navigation |
| `vite` | antfu/skills | `feb0f3a` | MIT | Vite 8 config and plugins |
| `vitest` | antfu/skills | `feb0f3a` | MIT | Vitest 5 API |
| `vercel-react-best-practices` | vercel-labs/agent-skills | `063bee9` | MIT | Client-side React performance |
| `vercel-composition-patterns` | vercel-labs/agent-skills | `063bee9` | MIT | Component API design, React 19 |
| `react-hook-form` | pproenca/dot-skills | `cf93c57` | MIT | Form performance |
| `react-testing` | affaan-m/ecc | `76aaa77` | MIT | RTL patterns |

Effect has no companion skill: its official guide ships inside the package
(`node_modules/effect/AGENTS.md`) and the generated `CLAUDE.md` tells Claude to read it first.
There is no TanStack Query companion: the most popular one contradicted this stack in most
examples, so `api-integration/references/react-query.md` is the source.

**Security note:** the official `shadcn` skill runs `npx shadcn@latest info --json` automatically
whenever it loads (line 17 of its `SKILL.md`) and pre-approves `shadcn@latest` commands, which would
execute whatever npm serves as `shadcn@latest` at that moment. `install-companions.sh` rewrites
every one of them to `pnpm exec shadcn`, the CLI pinned by the project's lockfile, and fails if
any `shadcn@latest` is left. Because
`skills-lock.json` keeps the upstream hash, `npx skills check` reports that skill as modified;
re-run the script after updating it.

## Maintaining

`../.gitattributes` (the repository root) keeps every file LF, so the shell scripts still run from a CRLF checkout
(`core.autocrlf=true`).

Run `pnpm install` once at the repository root: it installs the git hooks (husky). Commit
messages follow Conventional Commits (commitlint); the `pre-commit` hook checks staged scripts.
`pnpm lint` at the root checks every script at once. Projects from the boilerplate get the same
hooks (see its `CLAUDE.md`).

```
.claude-plugin/          ← plugin.json (name web-dev, version); ../.claude-plugin/ is the marketplace
skills/                  ← the product
  develop/  SKILL.md (entry point, routing), references/ (new-app, existing-project, plan)
  project-setup/  SKILL.md, scripts/ (create-project: a new project from the boilerplate;
                  install-companions)
  feature-development/  SKILL.md, references/ (the todos feature, outside-template)
  api-integration/  SKILL.md, references/ (effect-http, errors, msw, react-query, outside-template)
  ui-development/  SKILL.md, references/ (design-mapping, visual-check, outside-template)
references/              ← shared guidelines the skills read (stack, coding standards, architecture,
                           companions)
scripts/                 ← detect-project.mjs, verify-project.sh, run by the skills in projects
agents/                  ← codebase-explorer, shipped with the plugin
evals/                   ← routing cases for `claude plugin eval`, fixtures, check-detect.sh
docs/companion-audit.md  ← audit of the companion skills
```

Outside the plugin, at the repository root: `tools/` (maintainer scripts: `verify.sh`,
`extract-snippets.mjs`, `check-guidelines.mjs`, `check-create-project.sh`, `sync-references.sh`) and `.claude/` (maintainer agents and settings).
Neither ships with the plugin.

**Change the boilerplate or bump a dependency:**

1. Change the boilerplate (react-vite-boilerplate), run `pnpm check` in it and push.
2. `bash ../tools/verify.sh` — the shared references and fixture tiers, then a project created
   from the boilerplate, with the todos feature quoted in the skills (every ` ```tsx file=... `
   block, written out by `extract-snippets.mjs`) wired into its `apps/web`, all gates.
   `BOILERPLATE_REPO=file://<clone>` runs it on a local commit before the push.
3. Update every snippet in the skills that quotes a changed file. Snippets are copied from the
   boilerplate's `apps/web`, never written from memory; keep it that way. A block that shows a
   pattern found in neither the boilerplate nor the todos feature (a detail key, `setQueryData`) is marked
   ` ```ts sketch ` and says so in the text. A todos block keeps its `file=` path; a new todos
   file gets a block with its own `file=` path, or `verify.sh` never tests it.
4. Release: bump `version` in `.claude-plugin/plugin.json` (installs from git are cached copies,
   so without a bump nobody receives the change), add the entry to `CHANGELOG.md`, tag the
   commit `web-dev--v<version>`, and run
   `claude plugin validate --strict .claude-plugin/plugin.json` (and `claude plugin validate --strict ..`
   for the marketplace).

**Version traps** (Effect 4, React Router 8, MSW 3, TanStack Query 5, Tailwind 4, Vitest 5,
Storybook 10) are written once, in `references/stack-guidelines.md`; code style and the data flow
in `coding-standards.md` and `architecture.md` beside it. Skills point there and keep only the
traps specific to their own step. The boilerplate's `apps/web/CLAUDE.md` carries the same sections
word for word, so a project from it keeps them without the plugin. The boilerplate is the source:
change a section there, then `bash tools/sync-references.sh` copies it into `references/`;
`check-guidelines.mjs` (run by `verify.sh`) fails when the copies differ.

**Routing** (`skills/develop/SKILL.md`, the skills' descriptions, `scripts/detect-project.mjs`)
is tested by `evals/` with `claude plugin eval`, through `evals/run.sh` (see `evals/README.md`);
`verify.sh` checks the tier of every fixture without a model; the model evals run only
on request (`evals/README.md`, When evals run).

**CI** on GitHub Actions (`../.github/workflows/`: `ci.yml` for the free checks, also weekly
instead of a pipeline schedule; `companions.yml` weekly; `evals.yml`, the model evals, only from
a manual run on a release tag) and on GitLab
(`../.gitlab-ci.yml`), in `node:24`, on merge requests and pushes that touch the plugin
and on pipeline schedules: `claude plugin validate --strict` for the plugin and the marketplace,
and `verify.sh`. Schedules also run `install-companions.sh` in a new project from the boilerplate, so a
companion whose repo moved or deleted the pinned path shows up. Add a weekly schedule in GitLab (Build >
Pipeline schedules) so a boilerplate change that breaks the code the skills quote shows up before a
user hits it. On another Git host, run the same commands from your own CI.

**Upgrade a companion:** read the diff between the pinned and the new commit, re-check it
against the conventions, then change the SHA in `install-companions.sh`, in the table above and in
`docs/companion-audit.md`, and update its overrides in `references/companions.md`. The same holds for the `skills` CLI version.
