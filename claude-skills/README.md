# Claude Code skills for web development

Four Claude Code skills that let Claude build web apps on our standard stack and follow its
conventions on the first try (ticket [granbull/space#5127](https://gitlab.asoft-python.com/granbull/space/-/work_items/5127)).

**Stack:** React 19 · Vite 8 · TypeScript 6 · Effect 4 · TanStack Query 5 · React Hook Form 7 ·
shadcn/ui (Tailwind CSS 4) · React Router 8 · Vitest 5 + React Testing Library + MSW 3 · pnpm 11

| Skill | Use it for | Example prompt |
|---|---|---|
| `code-skeleton` | A new project: copies a verified template, installs, adds companion skills, runs all gates | "Scaffold a new web app called billing-portal" |
| `develop-feature` | A ticket → schemas, API calls, queries, form, the four UI states, routes, a unit test file per component. Loads `integrate-api` for endpoints beyond list + create and `design-to-ui` for a design | "Implement this ticket: <paste or GitLab URL>" |
| `integrate-api` | One endpoint: schema, `ApiClient` call, query or mutation, MSW mocks, error tests | "Add PATCH /todos/:id to toggle completion" |
| `design-to-ui` | A design (screenshot, mockup, Figma frame) → a UI that matches it: theme tokens, shadcn components, states, tests, a visual check in the browser | "Make the settings page look like design/settings.png" |

Out of scope: SSR / Next.js, backend code, CI/CD.

## Install

Requirements: Node ≥ 22.22, pnpm 11, Claude Code.

**New project.** Copy the four skill folders into the project (or into `~/.claude/skills/` to
have them everywhere), then ask Claude to scaffold:

```bash
mkdir billing-portal && cd billing-portal && git init
mkdir -p .claude/skills
cp -r <this-repo>/.claude/skills/{code-skeleton,develop-feature,integrate-api,design-to-ui} .claude/skills/
claude "Scaffold a new web app called billing-portal"
```

`code-skeleton` copies the template, runs `pnpm install`, installs the companion skills and runs
`pnpm check`. The generated `CLAUDE.md` holds the project conventions from then on.

**Existing project on this stack.** Copy the skills as above and install the companions from the
project root:

```bash
bash .claude/skills/code-skeleton/scripts/install-companions.sh
```

Commit `.claude/skills/` and `skills-lock.json` so the whole team gets the same skills.

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
- **Tests**: MSW 3 for every test (unhandled requests fail), `renderRoute` / `renderWithProviders`.
  Both mount the `Toaster` (with a `matchMedia` stub and a per-test reset in `setup.ts`), so a
  toast is asserted as text.
- **Guardrails in ESLint**: `no-restricted-imports` / `no-restricted-globals` reject the most
  common version mistakes (`react-router-dom`, `zod`, `axios`, `@effect/platform`, root `msw`
  helpers, `clsx`, global `fetch`).

`develop-feature/references/` quotes a full feature (todos: list + create form, a test file per component, 10 tests) and the
wiring diff for the three files a feature registers in. Its source is `evals/fixtures/todos/`, kept
out of the skill so installed projects never lint or test it.

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
whenever it loads (line 17 of its `SKILL.md`), which executes whatever npm serves as
`shadcn@latest` at that moment. We accepted this because it is the same CLI the project uses to
add components. Delete that line after installing if your policy forbids unpinned execution.

## Maintaining

```
.claude/skills/          ← the product: what gets copied into projects
  code-skeleton/  template/ (the app), scripts/ (scaffold, verify, install-companions), SKILL.md
  develop-feature/  SKILL.md, references/
  integrate-api/  SKILL.md, references/
  design-to-ui/  SKILL.md, references/
.claude/agents/          ← build tooling for this repo only (not copied into projects)
docs/companion-audit.md  ← audit of the companion skills
evals/                   ← end-to-end evals of the skills; fixtures/todos/ is the feature develop-feature quotes,
                           fixtures/designs/ the mockup the design eval builds from
```

**Change the template or bump a dependency:**

1. Edit `.claude/skills/code-skeleton/template/` and run `pnpm check` inside it.
2. `bash .claude/skills/code-skeleton/scripts/verify.sh` — fresh scaffold, all gates.
3. `bash evals/verify-example.sh` — every code block in every skill is copied verbatim from the
   template or the fixture (`evals/check-quotes.mjs`), the todos fixture is quoted in full in
   develop-feature's references, and it passes all gates on a fresh scaffold.
4. Update every snippet `check-quotes.mjs` names. Snippets are copied from the template, never
   written from memory; keep it that way. A block that shows a pattern found in neither (a detail
   key, `setQueryData`) is marked ` ```ts sketch ` and says so in the text.
5. Run the evals.

**Upgrade a companion:** read the diff between the pinned and the new commit, re-check it
against the conventions, then change the SHA in `install-companions.sh` and in the table above.

**Evals** run real headless Claude Code sessions in temp projects and grade them with a script
(gates, forbidden-pattern grep, file and registration checks, which skills were invoked, cost):

```bash
evals/run-evals.sh full skeleton feature api   # our skills + companions
evals/run-evals.sh skills feature design       # our skills only
evals/run-evals.sh skills feature-api          # a ticket that needs PATCH/DELETE/404: develop-feature must load integrate-api
evals/run-evals.sh none feature                # baseline without skills
evals/grade.sh evals/runs/<timestamp>
evals/trigger-check.sh                         # which skill fires for 14 short prompts (about $2)
```

Latest results and what they showed: [`evals/RESULTS.md`](evals/RESULTS.md). Each run is capped by `EVAL_BUDGET` (USD, default 3; a feature run cost about $0.42 on Sonnet) and `EVAL_MAX_TURNS`; the model defaults to
Sonnet (`EVAL_MODEL`). Results stay in `evals/runs/` (git-ignored).
