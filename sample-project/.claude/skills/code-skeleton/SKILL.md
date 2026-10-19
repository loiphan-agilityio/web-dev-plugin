---
name: code-skeleton
description: Scaffolds a new web app (React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query, React Router 8, shadcn/ui on Tailwind 4, Vitest 5 + MSW 3) from a verified template. Use when asked to create, scaffold, bootstrap or set up a new web app, project or frontend, to "start a new React app with our stack", or to make a "new project from the template". Do NOT use for adding features, pages or endpoints to an existing app (use develop-feature, integrate-api or design-to-ui).
---

# Code skeleton

Copies the pinned, verified template in `template/` into a new project, installs dependencies,
installs the companion skills, and runs every quality gate. The result is a working app
(Home page, routing, providers, Effect `ApiClient`, MSW, shadcn base components, tests) with
`CLAUDE.md` as the project's convention source.

## Why copy a template instead of `create vite` / `shadcn init`

Those CLIs generate different output as their versions move, and `shadcn init` needs an
interactive preset choice. The template is pinned (`pnpm-lock.yaml` included) and passes lint,
typecheck, test and build, so the new project starts green and identical every time.

## Workflow

`<skill-dir>` below is this skill's base directory, shown when the skill loads (for a
project-level install, `.claude/skills/code-skeleton`). Commands run from wherever you are, so
always call the scripts by that full path.

1. **Preconditions.** Run `node --version` and `pnpm --version`. Need Node >= 22.22 (React
   Router 8 engines; `package.json` `engines`) and pnpm 11 (`packageManager` pins
   `pnpm@11.17.0`). If either is missing or too old, stop and tell the user; do not install
   system tools unasked.
2. **Target and name.** Use what the user gave. Ask only if they gave neither a directory nor a
   name and the current directory is not an obviously empty project directory. The name must
   match `^[a-z0-9][a-z0-9._-]*$` (defaults to the directory's name).
3. **Scaffold.** `bash <skill-dir>/scripts/scaffold.sh <target-dir> [app-name]`. It copies the template
   (not `node_modules`, `dist`, `coverage`) and renames `app-template` in `package.json`,
   `index.html`, `CLAUDE.md`, `root-layout.tsx`, `home-page.tsx` and its test. It leaves an
   existing `.git/` and `.claude/` alone. On conflict it lists the existing files, exits 1 and
   copies nothing: show the list and ask the user how to proceed. Never delete or overwrite
   their files.
4. **Install.** In the target: `pnpm install` (the lockfile is included, so
   `--frozen-lockfile` also works).
5. **Companion skills.** From the target root: `bash <skill-dir>/scripts/install-companions.sh`.
   It runs `npx skills add` for 8 companions pinned by commit SHA into `.claude/skills/` and the
   CLI writes `skills-lock.json` at the project root; both should be committed. Needs network and
   Node. If it fails (e.g. offline), record it under **Not done** in Result and continue: the
   project skills and `CLAUDE.md` work without companions.
6. **Gates.** `pnpm check` (lint, typecheck, test, build). Report the real output, including
   failures. Optionally offer `git init` and a first commit; ask first, never commit unasked.
7. **Hand over.** Tell the user:
   - `pnpm dev`; `VITE_API_MOCKING=true pnpm dev` serves the API from `src/mocks` (MSW).
   - Copy `.env.example` to `.env.local` and set `VITE_API_URL` (all `VITE_*` values are public).
   - Conventions live in the project's `CLAUDE.md`.
   - Next steps: the `develop-feature` skill (ticket to working feature), the
     `integrate-api` skill (add or change an endpoint) and the `design-to-ui` skill (a design
     to a UI that matches it).

`<skill-dir>/scripts/verify.sh [--keep]` scaffolds into a temp dir, runs `pnpm install --frozen-lockfile`
and `pnpm check`; use it to confirm the template itself still passes.

## What the template contains

Stack (majors pinned in `template/package.json`): React 19.3, Vite 8.3, TypeScript ~6.0,
ESLint 10, Vitest 5 + jsdom, MSW 3, React Router 8.4, Effect 4.0.5, TanStack Query 5, React
Hook Form 7.90 with `@hookform/resolvers` 5.9 (`standardSchemaResolver`), shadcn 4.22 (style
`radix-nova`; `cn` comes from the `cn` package via `src/lib/utils.ts`), Tailwind 4.3 CSS-first
(tokens in `src/styles/index.css`, no `tailwind.config.js`). TypeScript stays on 6.0 because
typescript-eslint 8.71 supports `<6.1`.

Wiring worth knowing:

- `src/main.tsx` starts the MSW worker only when `import.meta.env.DEV && config.apiMocking`, so
  it is tree-shaken from production builds; `RouterProvider` comes from `react-router/dom`.
- `createRoutes()` is a factory because React Router 8 empties a `lazy` route object after
  loading it; a shared route array would break the second router, and every test makes one.
- `ApiClient`, `runEffect`, `ApiError` (`src/lib/api/`), `createQueryClient`, `AppLayer`
  runtime (`src/lib/`). `ApiClient` has a commented hook point for
  `HttpClientRequest.bearerToken`; auth flows are out of scope.
- MSW: `src/mocks/{handlers,server,browser}.ts`; `src/test/setup.ts` uses
  `onUnhandledFrame: 'error'`; `renderRoute` / `renderWithProviders` in `src/test/render.tsx`.
- ESLint `no-restricted-imports` / `no-restricted-globals` enforce the version traps:
  `react-router-dom`, `zod`, `axios`, `@effect/platform`, root `msw` `http` / `HttpResponse` /
  `delay` / `passthrough` / `bypass`, `clsx`, `tailwind-merge`, global `fetch`.
- shadcn components vendored in `src/components/ui`: button, input, label, card, field,
  skeleton, alert, sonner, separator. That folder is excluded from ESLint and Prettier; add or
  refresh components with `pnpm dlx shadcn@latest add <name>`, do not edit them by hand.

Out of scope: SSR / Next.js, backend, CI/CD, auth flows.

## Getting library APIs right

Setup-time traps (full list in the project's `CLAUDE.md`, "Library versions newer than most
training data"). Read the template files rather than recalling config from memory.

- **TypeScript 6:** `baseUrl` is deprecated; `tsconfig.app.json` uses `paths` only
  (`"@/*": ["./src/*"]`).
- **ESLint 10:** `eslint-plugin-jsx-a11y` 6.10.2 declares `eslint<=9` but works; it is allowed in
  `peerDependencyRules` in `pnpm-workspace.yaml`, as is `@hookform/resolvers>effect: 4` (that peer
  only applies to `effectTsResolver`, which the project does not use).
- **React Router 8:** no `react-router-dom`; import from `react-router`, `RouterProvider` from
  `react-router/dom`.
- **MSW 3:** `http` / `HttpResponse` from `msw/http`, `delay` / `bypass` / `passthrough` from
  `msw/utils/<name>`; the option is `onUnhandledFrame`, not `onUnhandledRequest`.
- **pnpm 11:** reads settings from `pnpm-workspace.yaml`, not `.npmrc` or `package.json`.

If `CLAUDE.md` and the template files ever disagree, trust the files and tell the user.

## Related skills

Companions installed by step 5, for setup-time questions:

- `vite`: config and plugins. Ignore its SSR and library-mode parts and the classic `jsxInject`
  snippet.
- `vitest`: config. Use MSW, not module mocks, for the API; use pnpm, not npm; Effect Schema (via `Schema.toStandardSchemaV1`), not zod, in `expect.schemaMatching`; Browser Mode is not used.
- `shadcn`: adding components and theming. Ignore the Tailwind v3 / `tailwind.config.js` branch,
  its RSC / `"use client"` notes (inert on Vite) and `next-themes` advice. When loaded it runs `npx shadcn@latest info --json` automatically
  (accepted knowingly; teams may strip that line).

The generated `CLAUDE.md` ("Skills" section) sets the priority when a companion disagrees with
the project conventions. After scaffolding, hand off to `develop-feature`, `integrate-api` and `design-to-ui`.

## Result

End your reply with:

**Did:** … **Saw:** … (real `pnpm check` output) **Not done:** … **Blocked by:** … **Next:** …
