---
name: project-setup
description: This skill should be used when the user asks to "scaffold a new web app", "create a new React project with our stack", "bootstrap a frontend" or "start a new project from the template", with no features described. It copies the verified web-dev template (React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query, shadcn/ui, Vitest, MSW), installs it, adds the companion skills and runs every gate. Not for an app described by its features (develop plans that), or for features, endpoints or screens in an existing app.
compatibility: "Claude Code, as part of the web-dev plugin only (reads the plugin's references/). Needs Node 22.22 or newer, pnpm 10 or newer, and network access for pnpm install and the companion skills."
---

# project-setup

Copy the pinned template in `assets/app-template/` into a new project and leave it green. A copied template, lockfile included, starts identical every time, where `create vite` and `shadcn init` drift between versions and `shadcn init` needs an interactive choice. The new project's `CLAUDE.md` is its convention source from then on.

`<skill-dir>` below is this skill's base directory, shown when it loads; call the scripts by that full path.

## 1. Preconditions

`node --version` (22.22 or newer: React Router 8's engines) and `pnpm --version` (10 or newer; it switches to the pinned `pnpm@11.17.0` inside the project). A missing or older tool stops the run: tell the user, and leave system tools to them.

## 2. Target and name

Use what the user gave. Ask only when they gave neither a folder nor a name and the current folder holds more than `.git/` or `.claude/`. The name matches `^[a-z0-9][a-z0-9._-]*$` and defaults to the folder's name.

## 3. Scaffold

`bash <skill-dir>/scripts/scaffold.sh <target-dir> [app-name]`. It copies the template without its local output, renames `app-template` in the files that carry it, keeps an existing `.git/` and `.claude/`, and writes `.claude/settings.json` (the allow-list of the commands the skills run) only when the project has none; say which under **Did**. On a conflict it lists the existing files, exits 1 and copies nothing: show the list and ask how to proceed; the user's files stay as they are.

## 4. Install

`pnpm install` in the target (the lockfile is included).

## 5. Companion skills

`bash <skill-dir>/scripts/install-companions.sh` from the target root. It installs 8 companions pinned by commit into `.claude/skills/` and writes `skills-lock.json` (both belong in git), and exits 1 if a companion failed, the lock is missing, or the shadcn companion still calls `shadcn@latest`. It needs network; a failure goes under **Not done** and the run continues, since the project skills and `CLAUDE.md` work without companions. What each companion gets wrong for this stack: `../../references/companions.md`.

## 6. Gates

`pnpm check` (lint with Prettier, typecheck, tests with coverage, build, Storybook build) as a plain command with no pipe or redirect: the allow-list covers exactly that. Report the real output, failures included.

Offer `git init` and a first commit; commit only on a yes. After `git init`, run `pnpm install` again so husky turns the hooks on, and write the message as a Conventional Commit (`chore: scaffold <app-name>`), since commitlint rejects anything else.

## 7. Hand over

Skip under `develop`'s Workflow A (it builds on and reports at the end). Otherwise tell the user:

- `pnpm dev`, or `pnpm dev:mock` to serve the API from `src/mocks` (MSW);
- copy `.env.example` to `.env.local` and set `VITE_API_URL` (every `VITE_*` value is public);
- conventions live in the project's `CLAUDE.md`;
- next: `feature-development` (a ticket), `api-integration` (an endpoint), `ui-development` (a design), or `/web-dev:develop` for any of them.

Setup traps: `../../references/stack-guidelines.md`. Read the template's files over recalling config: TypeScript 6 uses `paths` without `baseUrl`; pnpm 11 reads its settings from `pnpm-workspace.yaml`, where `eslint-plugin-jsx-a11y` is allowed on ESLint 10. When `CLAUDE.md` and the files disagree, the files win; tell the user.

## Result

Skip it under `develop`'s Workflow A; otherwise end with:

```
## Result
**Did:** files created, install, companions, and the `pnpm check` outcome
**Saw:** facts observed, including the real gate output
**Not done:** anything skipped or failed, such as a companion install
**Blocked by:** questions that stopped part of the work, or "nothing"
**Next:** what the user can do or ask next
```
