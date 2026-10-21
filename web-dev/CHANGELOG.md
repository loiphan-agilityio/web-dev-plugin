# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and is tagged `web-dev--v<version>`.
A git install is a cached copy, so a change reaches users only with a new version.

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
