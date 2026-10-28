---
name: project-setup
description: This skill should be used when the user asks to "scaffold a new web app", "create a new React project with our stack", "bootstrap a frontend" or "start a new project from the template" or "from the boilerplate", with no features described. It creates the project from the react-vite-boilerplate (a pnpm + Turborepo monorepo, the app in apps/web; React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query, shadcn/ui, Vitest, MSW), as a landing page or a web app with its authentication feature as the user chooses, installs it, adds the companion skills and runs every gate. Not for an app described by its features (develop plans that), or for features, endpoints or screens in an existing app.
compatibility: "Claude Code, as part of the web-dev plugin only (reads the plugin's references/). Needs Node 22.22 or newer, pnpm 10 or newer, git, and network access to clone the boilerplate, for pnpm install and the companion skills."
allowed-tools: Bash(node --version) Bash(pnpm --version) Bash(bash ${CLAUDE_SKILL_DIR}/scripts/create-project.sh *) Bash(bash ${CLAUDE_SKILL_DIR}/scripts/install-companions.sh) Bash(pnpm install) Bash(pnpm run prepare) Bash(pnpm test:e2e:install) Bash(pnpm check:report)
---

# project-setup

Create the project from the react-vite-boilerplate with the boilerplate's own generator (`create/index.js` in that repository), and leave it green. Every new project starts as the boilerplate at the commit this plugin version pins (`create-project.sh`), lockfile included, and authentication is the boilerplate's tested overlay, not code written here. The result is a pnpm + Turborepo monorepo: the app is `apps/web` (package `web`), the shadcn/ui kit `packages/ui` (`@repo/ui`). The project's root `CLAUDE.md` (the monorepo) and `apps/web/CLAUDE.md` (the app) are its convention source from then on.

Run the scripts exactly as written below, each as one plain command: `allowed-tools` approves these exact forms, so the setup runs without a permission prompt, headless included.

## 1. Preconditions

`node --version` (22.22 or newer: React Router 8's engines) and `pnpm --version` (10 or newer; it switches to the pinned `pnpm@11.17.0` inside the project). A missing or older tool stops the run: tell the user, and leave system tools to them.

## 2. Target and kind

- **Target:** the folder the user gave, or `<name>/` when they gave only a name. Ask only when they gave neither and the current folder holds more than `.git/` or `.claude/`.
- **Kind:** a landing page or a web app, the user's choice. When the request does not settle it ("landing page", "marketing site", "one-page site" → landing; "web app", "dashboard", "app", "admin", anything with sign-in or data the user edits → web app), ask this one question with the `AskUserQuestion` tool (header `Kind`, one option per choice below, its label in bold and the rest as its description; step 3's git questions go in the same call), and create nothing until they answer. Only when that tool is not available (a headless run), ask it as text, in the same message as any other question:

  > Build a landing page or a web app?
  > 1. **Landing page:** one public marketing page (hero, features, how it works, FAQ, a call to action), Open Graph tags, `sitemap.xml` and `robots.txt`; built and tested without mocks. No sign-in. Before launch, audit it with web-quality (axe, Lighthouse, PageSpeed).
  > 2. **Web app with authentication:** the boilerplate's app (routes, the API layer on mocks) and `apps/web/src/features/auth`: email + password sign-in to a JWT bearer token, sign out, `protectedRoutes()` for the pages that need a signed-in user, `/auth/me`, with MSW mocks (`demo@example.com` / `password`). No sign-up, no refresh token.

  Never pick the kind for the user, and never infer it from the folder. Never ask about authentication: every web app includes it, and there is no web app without it. A request for one without authentication ("without auth", "no login") does not settle the kind: ask the question above, saying so. Under `develop`'s Workflow A the kind is always a web app (`../develop/references/new-app.md`, A2): ask nothing.

## 3. Git

Before the project is created, put the target on git, and on the repository's `main` when there is one. Change nothing in git before the user answers. Run every command below in the target (`git init -b main <target>` creates the folder). First look for `.git/` in the target and each parent folder:

- **A parent folder has `.git/`:** never run `git init` (it would nest a repository) and ask nothing: say which repository the project is in, leave git to the user, skip the rest of this step and `pnpm run prepare` in step 8 (husky installs hooks only at a repository's root), and run step 4 without `--replace`.
- **No repository, or the target has `.git/`** (kept as it is): read what git already has, `git config user.name` and `git config user.email` (the global values while the target has no repository) and, when the target has `.git/`, `git remote get-url origin`. Then ask, with the kind when step 2 asks it (the `AskUserQuestion` tool when available, as for the kind; else as text, in one message):
  1. **Identity:** the name and email the commits carry. Offer the pair found ("Commit as <name> <email>") and a different one; with none found, ask for both, since a commit fails without them.
  2. **Repository:** the URL of the GitHub or GitLab repository (empty, or with a `main` the project will replace), local git only for now, or no git for now (which ends this step; step 4 runs without `--replace`). Skip it when `origin` exists. Use the URL exactly as given: an SSH host alias (`git@github-work:org/app.git`) picks the user's key.
  3. **Push:** push the scaffold commit to `main` at the end (step 8) or later; only with a repository.

Then run, in this order, only what the answers allow:

1. `git init -b main <target>` (CI deploys from `main`, the Pages projects' production branch).
2. `git config user.name "<name>"` and `git config user.email "<email>"` when the user gave a different pair: local to this repository, never `--global` (it would change every repository on the machine).
3. `git remote add origin <url>`.
4. `git ls-remote --exit-code --heads origin main`: exit 0 means the repository has `main`, 2 means it has none; any other exit (no access, no network) goes under **Blocked by** with its output, and nothing else in this step runs.
   - **`main` exists:** `git pull origin main`. A pull that fails (untracked files it would overwrite, a merge conflict) stops the run: report it under **Blocked by**. Then confirm before anything is replaced: ask (header `Replace`) whether to go on, saying that every file in the folder will be replaced by the new project (`.git/` and `.claude/` stay), or stop. Only a yes goes on to step 4, with `--replace`; a no ends the run, the folder as it is, under **Blocked by**.
   - **No `main`** (an empty repository) and no commit in the target yet: write `README.md` with the content `Hello World`, then `git add README.md`, `git commit -m "docs: add readme"` and `git push -u origin main`, which creates `main` (no hook yet: husky comes with the project). A rejected push goes under **Not done** with its output, and the run continues. Step 4 runs with `--replace` (the README is replaced by the project's).
   - **Local git only, or no `main` while the target already has commits** (`git rev-parse --verify HEAD`): no README; with commits, ask the same confirmation and run step 4 with `--replace`; without, run it without `--replace`.

Never `--no-verify` or `--force`. A no, a skipped question or a failed command goes under **Not done**.

## 4. Create

`bash ${CLAUDE_SKILL_DIR}/scripts/create-project.sh <target-dir> --auth` for a web app, or `--landing` for a landing page, followed by ` --replace` when step 3 says so (it deletes the files git tracks outside `.claude/`, then copies the project in; it refuses a working tree with uncommitted changes). It fetches the boilerplate at the commit this plugin version pins (the one its skills were verified against), runs its generator into a temporary folder and copies the result into the target, keeping `.git/` and `.claude/`. The project brings `.claude/settings.json` at its root and in `apps/web` (the commands the skills run, allowed without a prompt, and a hook that runs Prettier on each file Claude writes); an existing root one is kept, and the script says so: say which under **Did**. It copies nothing when:

- a project file already exists in the target (with `--replace`, a file git does not track): it lists them and exits 1. Show the list and ask how to proceed; the user's files stay as they are;
- the fetch fails (no network, no access to the repository, a `BOILERPLATE_REF` that does not exist), the repository has no generator, or the generator stops (it names a patch that no longer matches the boilerplate): report the output.

Never build the project by hand, from memory or from another template instead: report the failure under **Blocked by**.

## 5. Install

`pnpm install` in the target root: the lockfile is there, and it installs every workspace package.

## 6. Companion skills

`bash ${CLAUDE_SKILL_DIR}/scripts/install-companions.sh` from the target root. It installs 8 companions pinned by commit into `.claude/skills/` and writes `skills-lock.json` (both belong in git), and exits 1 if a companion failed, the lock does not record each companion at its pinned commit, or the shadcn companion still calls `shadcn@latest`. It needs network; a failure goes under **Not done** and the run continues, since the project skills and the `CLAUDE.md` files work without companions. What each companion gets wrong for this stack: `../../references/companions.md`.

## 7. Gates

`pnpm test:e2e:install` in the target root (Chromium for Playwright, once per machine; it needs network, and a failure goes under **Not done**), then `pnpm check:report` (the gates of `pnpm check`: lint with Prettier and anti-slop, typecheck, unit tests with coverage, build, Storybook build and the Playwright e2e tests, run one after another; it ends with a checklist table of each gate's status, the unit and e2e pass rates and line coverage: put that table in the result), each as a plain command with no pipe or redirect: the skill's `allowed-tools` cover exactly those. Report the real output, failures included.

## 8. Commit and push

Only when step 3 left a repository at the target's root:

1. `pnpm run prepare` so husky turns the hooks on (`pnpm install` finds nothing to do in the installed project and skips it); check that `.husky/_/pre-push` exists before saying the hooks are on.
2. `git add -A` and `git commit -m "chore: scaffold <folder-name>"`: a Conventional Commit, since commitlint rejects anything else.
3. When the user chose to push: `PROTECTED_BRANCHES=none git push -u origin main`: the project's `pre-push` hook refuses a push to `main`, and the scaffold is `main`'s base; every later change goes through a branch and `/web-dev:pr`. Never `--no-verify` or `--force`: a rejected push (a protected `main` on the host, for one) goes under **Not done** with its output.

## 9. Hand over

Skip under `develop`'s Workflow A (it builds on and reports at the end). Otherwise tell the user:

- `pnpm dev`, or `pnpm dev:mock` to serve the API from `apps/web/src/mocks` (MSW), from the root;
- what steps 3 and 8 left undone, from the root: `git init -b main`, `git config user.name` / `user.email` (no `--global`), `git remote add origin <url>`, `pnpm run prepare` (the hooks), `git add -A` and `git commit -m "chore: scaffold <folder-name>"`, then `PROTECTED_BRANCHES=none git push -u origin main`; `pr` needs the remote, and `deploy-setup` a GitHub one;
- a landing page: edit `apps/web/src/app/home-page.tsx` (copy, product name, contact address) and the site URL in `apps/web/public/sitemap.xml`, `robots.txt` and the `og:` tags in `apps/web/index.html`; CI runs Lighthouse on each Cloudflare Pages preview (`pnpm lighthouse <url>` locally), and `/web-quality:audit` covers axe, Lighthouse and PageSpeed before launch;
- a web app: sign in as `demo@example.com` / `password` on the mocks; the home page sits inside `protectedRoutes()`, and a new page that needs a signed-in user goes there too (`apps/web/src/app/routes.tsx`);
- copy `apps/web/.env.example` to `apps/web/.env.local` and set `VITE_API_URL` (every `VITE_*` value is public);
- conventions live in the root `CLAUDE.md` (the monorepo, its packages, adding an app or a package) and `apps/web/CLAUDE.md` (the app; where its paths differ from the skills' examples, it wins);
- the web-dev skills run from `apps/web` (`cd apps/web`): at the root, `develop` reports a monorepo root and stops;
- CI/CD comes with the project (`.github/workflows/ci.yml`: the gates, a Cloudflare Pages preview per pull request, Lighthouse, production, then e2e on it), and deploys nothing until it is connected: `deploy-setup` creates the Pages projects and sets the GitHub secret and variables;
- next: `feature-development` (a ticket), `api-integration` (an endpoint), `ui-development` (a design), `deploy-setup` (the deploy), or `/web-dev:develop` for any of them.

Setup traps: `../../references/stack-guidelines.md`. Read the project's files over recalling config: TypeScript 6 uses `paths` without `baseUrl`; pnpm 11 reads its settings (catalog, overrides) from `pnpm-workspace.yaml`; the only linter is Oxlint (`oxlint.config.ts`). When a `CLAUDE.md` and the files disagree, the files win; tell the user.

## Result

Skip it under `develop`'s Workflow A; otherwise end with:

```
## Result
**Did:** the project created (folder, landing page or web app with authentication), install, companions, the `pnpm check:report` checklist, and git (initialized, identity, remote, `main` pulled and replaced or seeded with the README, committed, hooks on, pushed, or why not)
**Saw:** facts observed, including the real gate output
**Not done:** anything skipped or failed, such as a companion install
**Blocked by:** questions that stopped part of the work (the kind, the replace confirmation, a failed pull), or "nothing"
**Next:** what the user can do or ask next
```
