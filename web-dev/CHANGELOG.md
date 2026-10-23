# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and is tagged `web-dev--v<version>`.
A git install is a cached copy, so a change reaches users only with a new version.

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
