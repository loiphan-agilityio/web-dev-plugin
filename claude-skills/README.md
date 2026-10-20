# Claude Code skills for web development

Four Claude Code skills that let Claude build web apps on our standard stack and follow its
conventions on the first try (ticket [granbull/space#5127](https://gitlab.asoft-python.com/granbull/space/-/work_items/5127)).

**Stack:** React 19 · Vite 8 · TypeScript 6 · Effect 4 · TanStack Query 5 · React Hook Form 7 ·
shadcn/ui (Tailwind CSS 4) · React Router 8 · Vitest 5 + React Testing Library + MSW 3 · Storybook 10 · pnpm 11

| Skill | Use it for | Example prompt |
|---|---|---|
| `code-skeleton` | A new project: copies a verified template, installs, adds companion skills, runs all gates | "Scaffold a new web app called billing-portal" |
| `develop-feature` | A ticket → schemas, API calls, queries, form, the four UI states, routes, a unit test file and a story file per component. Loads `integrate-api` for endpoints beyond list + create and `design-to-ui` for a design | "Implement this ticket: <paste or GitLab URL>" |
| `integrate-api` | One endpoint: schema, `ApiClient` call, query or mutation, MSW mocks, error tests | "Add PATCH /todos/:id to toggle completion" |
| `design-to-ui` | A design (screenshot, mockup, Figma frame) → a UI that matches it: theme tokens, shadcn components, states, tests, a visual check in the browser | "Make the settings page look like design/settings.png" |

Out of scope: SSR / Next.js, backend code, CI/CD.

## Install

Requirements: Node ≥ 22.22, pnpm 11, Claude Code.

**As a plugin (recommended).** The repository root is a marketplace
(`.claude-plugin/marketplace.json`) that lists this folder as the plugin `web-app-skills`.
Install it once and the skills load in every project:

```bash
git clone -b web-development-skills git@gitlab.asoft-python.com:loi.phan/claude-training.git
claude plugin marketplace add ./claude-training
claude plugin install web-app-skills@claude-training
```

The plugin lives on the `web-development-skills` branch (the repository's default branch is
another project), hence `-b`. It is read in place from the clone: `git pull` and
`/reload-plugins` bring the latest skills. Claude still picks a skill from the prompt; typed,
plugin skills are namespaced (`/web-app-skills:code-skeleton`). Then, in an empty folder:
`claude "Scaffold a new web app called billing-portal"`.

**Or copy the folders.** Copy the four skill folders into the project (or into `~/.claude/skills/`
to have them everywhere), then ask Claude to scaffold:

```bash
mkdir billing-portal && cd billing-portal && git init
mkdir -p .claude/skills
cp -r <this-repo>/.claude/skills/{code-skeleton,develop-feature,integrate-api,design-to-ui} .claude/skills/
claude "Scaffold a new web app called billing-portal"
```

`code-skeleton` copies the template, runs `pnpm install`, installs the companion skills and runs
`pnpm check`. The generated `CLAUDE.md` holds the project conventions from then on.

**Existing project on this stack.** Install the plugin (or copy the skills) as above and install
the companions from the project root (`<this-repo>` is the path to `claude-training/claude-skills`;
the script installs into the current folder):

```bash
bash <this-repo>/.claude/skills/code-skeleton/scripts/install-companions.sh
```

With copied folders, commit `.claude/skills/` and `skills-lock.json` so the whole team gets the
same skills.

## What the template gives you

`.claude/skills/code-skeleton/template/` is a complete app that passes lint, typecheck, tests and
build. The parts every feature builds on:

- **`ApiClient`** (`src/lib/api/client.ts`): the only way to call the backend. Effect 4
  `HttpClient`, decodes every body with an Effect Schema and maps every failure to a typed
  `ApiError` (`NetworkError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
  `ValidationError`, `ServerError`, `InvalidResponseError`). Tested in `client.test.ts`.
- **`runEffect`** (`src/lib/api/run.ts`): runs an effect for TanStack Query, passes the abort
  signal, rejects with the typed error so `query.error._tag` is safe to switch on.
- **Forms**: React Hook Form + `standardSchemaResolver(Schema.toStandardSchemaV1(schema))` +
  shadcn `Field`; `setFormErrors` puts server field errors under the right inputs.
- **MSW worker**: `public/mockServiceWorker.js` is not in the template; the `postinstall` script
  (`msw init`) writes it from the installed msw, so it always matches the msw version.
- **Tests**: MSW 3 for every test (unhandled requests fail), `renderRoute` / `renderWithProviders`.
  Both mount the `Toaster` (with a `matchMedia` stub and a per-test reset in `setup.ts`), so a
  toast is asserted as text.
- **Storybook 10** (`.storybook/`): stories render inside `story-providers.tsx` (the same
  providers as a test) with MSW served by the app's worker; `pnpm build-storybook` is a gate.
- **Config**: `src/lib/config.ts` validates every `VITE_*` value with Effect Schema at startup.
- **Coverage**: `pnpm test` fails below 80% lines in `src/features/**` and `src/lib/**`.
- **Guardrails in ESLint**: `no-restricted-imports` / `no-restricted-globals` reject the most
  common version mistakes (`react-router-dom`, `zod`, `axios`, `@effect/platform`, root `msw`
  helpers, `clsx`, global `fetch`).

`develop-feature/references/` (with `api.ts` and `mocks.ts` in `integrate-api/references/`) quotes a full feature (todos: list + create form, a test file per component, 10 tests) and the
wiring diff for the three files a feature registers in.

## Pinned versions and why

| Package | Version | Note |
|---|---|---|
| typescript | ~6.0 | typescript-eslint 8.71 supports `<6.1`, so not 7.x yet. `baseUrl` is deprecated in 6; `paths` only. |
| eslint | 10 | ESLint 9 is end-of-life. `eslint-plugin-jsx-a11y` 6.10.2 declares `<=9` but works on 10 (checked against a file with a11y violations); allowed in `pnpm-workspace.yaml`. |
| effect | 4.0.5 | `@hookform/resolvers`' `effectTsResolver` only supports Effect 3, so forms use `standardSchemaResolver`. |
| react-router | 8.4 | No `react-router-dom`. React Router mutates lazy route objects once loaded, so route trees are factories (`createRoutes()`). |
| msw | 3.0 | `http`/`HttpResponse` from `msw/http`, `delay` from `msw/utils/delay`, `onUnhandledFrame`. |
| vitest | 5.0 | `clearMocks` on by default; `vi.mock` top-level only. |
| shadcn | 4.22 | Style `radix-nova`; `cn` comes from shadcn's `cn` package. |
| storybook | 10.6 | `@storybook/react-vite` + addon-a11y. No `msw-storybook-addon`: 3.0.3 calls MSW 2's `onUnhandledRequest`, so `.storybook/preview.tsx` starts the app's own worker. Its esbuild dependency is listed under `allowBuilds` (false) in `pnpm-workspace.yaml`, or pnpm 11 fails the install. |

## Companion skills

Popular third-party skills for parts of the stack, installed next to ours by
`install-companions.sh` and pinned to the commit we audited. Each was read in full for security
and fit; the full findings are in [`docs/companion-audit.md`](docs/companion-audit.md). When a
companion disagrees with the project, the project's `CLAUDE.md` and our four skills win.

| Skill | Source | Commit | License | What it is for | What we override |
|---|---|---|---|---|---|
| `shadcn` | shadcn-ui/ui (official) | `d2fba50` | MIT | Adding and composing components, `Field` forms | Tailwind v3 branch, `next-themes` |
| `react-router-data-mode` | remix-run/agent-skills (official) | `33578aa` | MIT | Routing and navigation | Written for v7; loader/`useFetcher` data path (we use TanStack Query), SSR file |
| `vite` | antfu/skills | `feb0f3a` | MIT | Vite 8 config and plugins | SSR / library mode |
| `vitest` | antfu/skills | `feb0f3a` | MIT | Vitest 5 API | Network mocking via MSW only |
| `vercel-react-best-practices` | vercel-labs/agent-skills | `063bee9` | MIT | Client-side React performance | All `server-*` / Next.js rules, SWR |
| `vercel-composition-patterns` | vercel-labs/agent-skills | `063bee9` | MIT | Component API design, React 19 | React Native examples |
| `react-hook-form` | pproenca/dot-skills | `cf93c57` | MIT | Form performance | `zodResolver`, old shadcn `Form` |
| `react-testing` | affaan-m/ecc | `76aaa77` | MIT | RTL patterns | Jest, MSW v2 imports |

Effect has no companion skill: its official guide ships inside the package
(`node_modules/effect/AGENTS.md`) and the generated `CLAUDE.md` tells Claude to read it first.
There is no TanStack Query companion: the most popular one contradicted this stack in most
examples, so `integrate-api/references/react-query.md` is the source.

**Security note:** the official `shadcn` skill runs `npx shadcn@latest info --json` automatically
whenever it loads (line 17 of its `SKILL.md`) and pre-approves `shadcn@latest` commands, which would
execute whatever npm serves as `shadcn@latest` at that moment. `install-companions.sh` rewrites
every one of them to `pnpm exec shadcn`, the CLI pinned by the project's lockfile. Because
`skills-lock.json` keeps the upstream hash, `npx skills check` reports that skill as modified;
re-run the script after updating it.

## Maintaining

`.gitattributes` keeps every file LF, so the shell scripts still run from a CRLF checkout
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
2. `bash .claude/skills/code-skeleton/scripts/verify.sh` — fresh scaffold, all gates.
3. Update every snippet in the skills that quotes a changed file. Snippets are copied from the
   template, never written from memory; keep it that way. A block that shows a pattern found in
   neither the template nor the todos feature (a detail key, `setQueryData`) is marked
   ` ```ts sketch ` and says so in the text.
4. Release: bump `version` in `.claude-plugin/plugin.json` and run
   `claude plugin validate --strict .claude-plugin/plugin.json` (and `claude plugin validate --strict ..`
   for the marketplace).

**Version traps** (Effect 4, React Router 8, MSW 3, TanStack Query 5, Tailwind 4, Vitest 5,
Storybook 10) are written once, in the template's `CLAUDE.md` ("Library versions newer than most
training data"). Skills point there and keep only the traps specific to their own step.

**CI** (`../.gitlab-ci.yml`) runs `verify.sh` in `node:24`
on merge requests and pushes that touch the plugin, and on pipeline schedules. Add a weekly schedule
in GitLab (Build > Pipeline schedules) so a dependency release that breaks the template shows up
before a teammate hits it.

**Upgrade a companion:** read the diff between the pinned and the new commit, re-check it
against the conventions, then change the SHA in `install-companions.sh` and in the table above.
