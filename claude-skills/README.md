# Claude Code skills for web development

Five Claude Code skills that let Claude build web apps on a modern React stack and follow its
conventions on the first try.

**Stack:** React 19 · Vite 8 · TypeScript 6 · Effect 4 · TanStack Query 5 · React Hook Form 7 ·
shadcn/ui (Tailwind CSS 4) · React Router 8 · Vitest 5 + React Testing Library + MSW 3 · Storybook 10 · pnpm 11

| Skill | Use it for | Example prompt |
|---|---|---|
| `build-app` | A whole app from one description, on any topic: plans features, data model, API and mock data in `docs/plan.md`, then runs the four skills below, all gates, and opens the app on a mocked API. Decides instead of asking and lists every assumption | "Build me a library management app: books, members, loans" |
| `code-skeleton` | A new project: copies a verified template, installs, adds companion skills, runs all gates | "Scaffold a new web app called billing-portal" |
| `develop-feature` | A ticket → schemas, API calls, queries, form, the four UI states, routes, a unit test file and a story file per component. Loads `integrate-api` for endpoints beyond list + create and `design-to-ui` for a design | "Implement this ticket: <paste or issue URL>" |
| `integrate-api` | One endpoint: schema, `ApiClient` call, query or mutation, MSW mocks, error tests | "Add PATCH /todos/:id to toggle completion" |
| `design-to-ui` | A design (screenshot, mockup, Figma frame) → a UI that matches it: theme tokens, shadcn components, states, tests, a visual check in the browser | "Make the settings page look like design/settings.png" |

Out of scope: SSR / Next.js, backend code, CI/CD.

## Install

Requirements: Node ≥ 22.22, pnpm 10 or newer (it switches to the pinned pnpm 11.17 by itself), Claude Code.

**As a plugin (recommended).** The repository root is a marketplace
(`.claude-plugin/marketplace.json`) that lists this folder as the plugin `web-app-skills`.
Install it once and the skills load in every project:

```bash
git clone -b <branch> <repo-url> claude-training
claude plugin marketplace add ./claude-training
claude plugin install web-app-skills@claude-training
```

`<branch>` is the branch that holds `.claude-plugin/marketplace.json` (for a fork, the branch you
forked); leave out `-b` when it is the default branch. The plugin is read in place from the clone: `git pull` and
`/reload-plugins` bring the latest skills. Claude still picks a skill from the prompt; typed,
plugin skills are namespaced (`/web-app-skills:build-app`). Then, in an empty folder, one message
builds a whole app: `claude "Build me a library management app: books, members and loans"`, or
just the skeleton: `claude "Scaffold a new web app called billing-portal"`.

**Or copy the folders.** Copy the five skill folders into the project (or into `~/.claude/skills/`
to have them everywhere), then ask Claude to scaffold. `<plugin-dir>` below is the
`claude-skills/` folder of your clone:

```bash
mkdir billing-portal && cd billing-portal && git init
mkdir -p .claude/skills
cp -r <plugin-dir>/.claude/skills/{build-app,code-skeleton,develop-feature,integrate-api,design-to-ui} .claude/skills/
claude "Scaffold a new web app called billing-portal"
```

`code-skeleton` copies the template, runs `pnpm install`, installs the companion skills and runs
`pnpm check`. The generated `CLAUDE.md` holds the project conventions from then on.

**Existing project on this stack.** Install the plugin (or copy the skills) as above and install
the companions from the project root (the script installs into the current folder):

```bash
bash <plugin-dir>/.claude/skills/code-skeleton/scripts/install-companions.sh
```

With copied folders, commit `.claude/skills/` and `skills-lock.json` so everyone on the project gets
the same skills.

## What the template gives you

`.claude/skills/code-skeleton/template/` is a complete app that passes lint, typecheck, tests,
build and Storybook build. The parts every feature builds on:

- **`ApiClient`** (`src/lib/api/client.ts`): the only way to call the backend. Effect 4
  `HttpClient`, decodes every body with an Effect Schema and maps every failure to a typed
  `ApiError` (`NetworkError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
  `ValidationError`, `ServerError`, `InvalidResponseError`). Tested in `client.test.ts`.
- **`runEffect`** (`src/lib/api/run.ts`): runs an effect for TanStack Query, passes the abort
  signal, rejects with the typed error so `query.error._tag` is safe to switch on.
- **Forms**: React Hook Form + `effectTsResolver(schema)` (`@hookform/resolvers` 6, Effect 4) +
  shadcn `Field`; `setFormErrors` puts server field errors under the right inputs.
- **MSW worker**: `public/mockServiceWorker.js` is not in the template; the `postinstall` script
  (`msw init`) writes it from the installed msw, so it always matches the msw version. `pnpm dev:mock` (Vite mode `mock`, `.env.mock`) serves the API from those handlers in any shell, Windows included.
- **Tests**: MSW 3 for every test (unhandled requests fail), `renderRoute` / `renderWithProviders`.
  Both mount the `Toaster` (with a `matchMedia` stub and a per-test reset in `setup.ts`), so a
  toast is asserted as text.
- **Storybook 10** (`.storybook/`): stories render inside `story-providers.tsx` (the same
  providers as a test) with MSW served by the app's worker; `pnpm build-storybook` is a gate.
- **Config**: `src/lib/config.ts` validates every `VITE_*` value with Effect Schema at startup.
- **Permissions**: `.claude/settings.json` allows exactly the pnpm commands the skills run
  (`install`, `lint`, `lint:fix`, `typecheck`, `test`, `build`, `build-storybook`, `check`,
  `dev:mock`, `exec shadcn add` / `info`), so a feature runs end to end without a prompt.
  `scaffold.sh` copies it only when the project has no `.claude/settings.json`.
  Claude Code applies a project's allow rules only once the folder is trusted: open it with
  `claude` once and accept the trust prompt. Until then it reports "this workspace has not been
  trusted" and every `pnpm` command needs approval. A headless run (`claude -p`, CI) in a new
  folder passes the same list instead: `claude -p "..." --settings .claude/settings.json`.
- **Coverage**: `pnpm test` fails below 80% lines in `src/features/**` and `src/lib/**`.
- **Guardrails in ESLint**: `no-restricted-imports` / `no-restricted-globals` reject the most
  common version mistakes (`react-router-dom`, `zod`, `axios`, `@effect/platform`, root `msw`
  helpers, `clsx`, `fetch` in any form, `XMLHttpRequest`); `pnpm lint` also runs `prettier --check`.
- **Code style in ESLint**: arrow functions only (`func-style`, `prefer-arrow-callback`; `function*` stays for Effect), destructuring, shorthand, template literals, `??` / `?.` and the rest of `typescript-eslint`'s `stylisticTypeChecked`, so code the skills write later reads like the template.

`develop-feature/references/` (with `api.ts` and `mocks.ts` in `integrate-api/references/`) quotes a full feature (todos: list + create form, a test file per component, 10 tests) and the
wiring diff for the three files a feature registers in.

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

**Known advisory:** `pnpm audit` reports GHSA-vfj7-8cjw-p6xm (`braces` <=3.0.3, high) through
the shadcn CLI. It runs at dev time on the project's own glob patterns and nothing of it ships to
the browser, and no patched `braces` exists yet, so the template lists it under
`auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`, with that reason. CI runs `pnpm audit`, so any
other advisory fails it. Remove the entry once a fixed `braces` is released.

## Companion skills

Popular third-party skills for parts of the stack, installed next to the five
skills by `install-companions.sh` and pinned to an audited commit. Each was read in full for security
and fit; the findings, and what each skill must tell Claude to ignore, are in
[`docs/companion-audit.md`](docs/companion-audit.md). When a companion disagrees with the project,
the project's `CLAUDE.md` and the five project skills win. The installer is pinned too:
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
examples, so `integrate-api/references/react-query.md` is the source.

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

```
.claude-plugin/          ← plugin.json (name web-app-skills, version); ../.claude-plugin/ is the marketplace
.claude/skills/          ← the product: what gets copied into projects
  code-skeleton/  template/ (the app), scripts/ (scaffold, verify, install-companions), SKILL.md
  develop-feature/  SKILL.md, references/
  integrate-api/  SKILL.md, references/
  design-to-ui/  SKILL.md, references/
.claude/agents/          ← build tooling for this repo only (not copied into projects)
docs/companion-audit.md  ← audit of the companion skills
```

**Change the template or bump a dependency:**

1. Edit `.claude/skills/code-skeleton/template/` and run `pnpm check` inside it.
2. `bash .claude/skills/code-skeleton/scripts/verify.sh` — fresh scaffold, all gates; then the
   todos feature quoted in the skills (every ` ```tsx file=... ` block, written out by
   `extract-snippets.mjs`) wired into it, all gates again.
3. Update every snippet in the skills that quotes a changed file. Snippets are copied from the
   template, never written from memory; keep it that way. A block that shows a pattern found in
   neither the template nor the todos feature (a detail key, `setQueryData`) is marked
   ` ```ts sketch ` and says so in the text. A todos block keeps its `file=` path; a new todos
   file gets a block with its own `file=` path, or `verify.sh` never tests it.
4. Release: bump `version` in `.claude-plugin/plugin.json` and run
   `claude plugin validate --strict .claude-plugin/plugin.json` (and `claude plugin validate --strict ..`
   for the marketplace).

**Version traps** (Effect 4, React Router 8, MSW 3, TanStack Query 5, Tailwind 4, Vitest 5,
Storybook 10) are written once, in the template's `CLAUDE.md` ("Library versions newer than most
training data"). Skills point there and keep only the traps specific to their own step.

**CI** (`../.gitlab-ci.yml`), in `node:24`, on merge requests and pushes that touch the plugin
and on pipeline schedules: `claude plugin validate --strict` for the plugin and the marketplace,
and `verify.sh`. Schedules also run `install-companions.sh` in a fresh scaffold, so a companion
whose repo moved or deleted the pinned path shows up. Add a weekly schedule in GitLab (Build >
Pipeline schedules) so a dependency release that breaks the template shows up before a user hits
it. On another Git host, run the same commands from your own CI.

**Upgrade a companion:** read the diff between the pinned and the new commit, re-check it
against the conventions, then change the SHA in `install-companions.sh`, in the table above and in
`docs/companion-audit.md` (with its override notes). The same holds for the `skills` CLI version.
