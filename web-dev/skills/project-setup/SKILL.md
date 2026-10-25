---
name: project-setup
description: This skill should be used when the user asks to "scaffold a new web app", "create a new React project with our stack", "bootstrap a frontend" or "start a new project from the template" or "from the boilerplate", with no features described. It creates the project from the react-vite-boilerplate (a pnpm + Turborepo monorepo, the app in apps/web; React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query, shadcn/ui, Vitest, MSW), as a landing page or a web app (with or without its authentication feature) as the user chooses, installs it, adds the companion skills and runs every gate. Not for an app described by its features (develop plans that), or for features, endpoints or screens in an existing app.
compatibility: "Claude Code, as part of the web-dev plugin only (reads the plugin's references/). Needs Node 22.22 or newer, pnpm 10 or newer, git, and network access to clone the boilerplate, for pnpm install and the companion skills."
allowed-tools: Bash(node --version) Bash(pnpm --version) Bash(bash ${CLAUDE_SKILL_DIR}/scripts/create-project.sh *) Bash(bash ${CLAUDE_SKILL_DIR}/scripts/install-companions.sh) Bash(pnpm install) Bash(pnpm run prepare) Bash(pnpm test:e2e:install) Bash(pnpm check:report)
---

# project-setup

Create the project from the react-vite-boilerplate with the boilerplate's own generator (`create/index.js` in that repository), and leave it green. Every new project starts as the boilerplate at the commit this plugin version pins (`create-project.sh`), lockfile included, and authentication is the boilerplate's tested overlay, not code written here. The result is a pnpm + Turborepo monorepo: the app is `apps/web` (package `web`), the shadcn/ui kit `packages/ui` (`@repo/ui`). The project's root `CLAUDE.md` (the monorepo) and `apps/web/CLAUDE.md` (the app) are its convention source from then on.

Run the scripts exactly as written below, each as one plain command: `allowed-tools` approves these exact forms, so the setup runs without a permission prompt, headless included.

## 1. Preconditions

`node --version` (22.22 or newer: React Router 8's engines) and `pnpm --version` (10 or newer; it switches to the pinned `pnpm@11.17.0` inside the project). A missing or older tool stops the run: tell the user, and leave system tools to them.

## 2. Target, kind and authentication

- **Target:** the folder the user gave, or `<name>/` when they gave only a name. Ask only when they gave neither and the current folder holds more than `.git/` or `.claude/`.
- **Kind:** a landing page or a web app, the user's choice. When the request does not settle it ("landing page", "marketing site", "one-page site" → landing; "dashboard", "app", "admin", anything with sign-in or data the user edits → web app), ask once, together with authentication, and create nothing until they answer:

  > Build a landing page or a web app?
  > - **Landing page:** one public marketing page (hero, features, how it works, FAQ, a call to action), Open Graph tags, `sitemap.xml` and `robots.txt`; built and tested without mocks. No sign-in. Before launch, audit it with web-quality (axe, Lighthouse, PageSpeed).
  > - **Web app:** the boilerplate's app: routes, the API layer on mocks, and optionally authentication.

  A landing page has no authentication question: skip it.
- **Authentication** (web app only): the user's choice. When the request does not settle it ("with login", "with sign-in" → yes; "without auth", "no login" → no), ask once, in the same message as any other question, and create nothing until they answer:

  > Include authentication?
  > - **Yes:** `apps/web/src/features/auth`: email + password sign-in to a JWT bearer token, sign out, `protectedRoutes()` for the pages that need a signed-in user, `/auth/me`, with MSW mocks (`demo@example.com` / `password`). No sign-up, no refresh token.
  > - **No:** the boilerplate as it is: every route public, `ApiClient` sends no token.

  Never pick it for the user, and never infer it from the folder. Under `develop`'s Workflow A the plan has already decided both (`../develop/references/new-app.md`, A1): pass that answer and ask nothing.

## 3. Create

`bash ${CLAUDE_SKILL_DIR}/scripts/create-project.sh <target-dir> --auth`, or `--no-auth`, or `--landing` for a landing page. It fetches the boilerplate at the commit this plugin version pins (the one its skills were verified against), runs its generator into a temporary folder and copies the result into the target, keeping an existing `.git/` and `.claude/`. The project brings `.claude/settings.json` at its root and in `apps/web` (the commands the skills run, allowed without a prompt, and a hook that runs Prettier on each file Claude writes); an existing root one is kept, and the script says so: say which under **Did**. It copies nothing when:

- a project file already exists in the target: it lists them and exits 1. Show the list and ask how to proceed; the user's files stay as they are;
- the fetch fails (no network, no access to the repository, a `BOILERPLATE_REF` that does not exist), the repository has no generator, or the generator stops (it names a patch that no longer matches the boilerplate): report the output.

Never build the project by hand, from memory or from another template instead: report the failure under **Blocked by**.

## 4. Install

`pnpm install` in the target root: the lockfile is there, and it installs every workspace package.

## 5. Companion skills

`bash ${CLAUDE_SKILL_DIR}/scripts/install-companions.sh` from the target root. It installs 8 companions pinned by commit into `.claude/skills/` and writes `skills-lock.json` (both belong in git), and exits 1 if a companion failed, the lock does not record each companion at its pinned commit, or the shadcn companion still calls `shadcn@latest`. It needs network; a failure goes under **Not done** and the run continues, since the project skills and the `CLAUDE.md` files work without companions. What each companion gets wrong for this stack: `../../references/companions.md`.

## 6. Gates

`pnpm test:e2e:install` in the target root (Chromium for Playwright, once per machine; it needs network, and a failure goes under **Not done**), then `pnpm check:report` (the gates of `pnpm check`: lint with Prettier and anti-slop, typecheck, unit tests with coverage, build, Storybook build and the Playwright e2e tests, run one after another; it ends with a checklist table of each gate's status, the unit and e2e pass rates and line coverage: put that table in the result), each as a plain command with no pipe or redirect: the skill's `allowed-tools` cover exactly those. Report the real output, failures included.

Offer `git init` and a first commit; commit only on a yes. After `git init`, run `pnpm run prepare` so husky turns the hooks on (`pnpm install` finds nothing to do in the installed project and skips it); check that `.husky/_/pre-push` exists before saying the hooks are on. Write the message as a Conventional Commit (`chore: scaffold <folder-name>`), since commitlint rejects anything else.

## 7. Hand over

Skip under `develop`'s Workflow A (it builds on and reports at the end). Otherwise tell the user:

- `pnpm dev`, or `pnpm dev:mock` to serve the API from `apps/web/src/mocks` (MSW), from the root;
- a landing page: edit `apps/web/src/app/home-page.tsx` (copy, product name, contact address) and the site URL in `apps/web/public/sitemap.xml`, `robots.txt` and the `og:` tags in `apps/web/index.html`; CI runs Lighthouse on each Netlify draft (`pnpm lighthouse <url>` locally), and `/web-quality:audit` covers axe, Lighthouse and PageSpeed before launch;
- with authentication: sign in as `demo@example.com` / `password` on the mocks; the home page sits inside `protectedRoutes()`, and a new page that needs a signed-in user goes there too (`apps/web/src/app/routes.tsx`);
- copy `apps/web/.env.example` to `apps/web/.env.local` and set `VITE_API_URL` (every `VITE_*` value is public);
- conventions live in the root `CLAUDE.md` (the monorepo, its packages, adding an app or a package) and `apps/web/CLAUDE.md` (the app; where its paths differ from the skills' examples, it wins);
- the web-dev skills run from `apps/web` (`cd apps/web`): at the root, `develop` reports a monorepo root and stops;
- next: `feature-development` (a ticket), `api-integration` (an endpoint), `ui-development` (a design), or `/web-dev:develop` for any of them.

Setup traps: `../../references/stack-guidelines.md`. Read the project's files over recalling config: TypeScript 6 uses `paths` without `baseUrl`; pnpm 11 reads its settings from `pnpm-workspace.yaml`, where `eslint-plugin-jsx-a11y` is allowed on ESLint 10. When a `CLAUDE.md` and the files disagree, the files win; tell the user.

## Result

Skip it under `develop`'s Workflow A; otherwise end with:

```
## Result
**Did:** the project created (folder, landing page or web app, with or without authentication), install, companions, and the `pnpm check:report` checklist
**Saw:** facts observed, including the real gate output
**Not done:** anything skipped or failed, such as a companion install
**Blocked by:** questions that stopped part of the work (the kind or the authentication choice), or "nothing"
**Next:** what the user can do or ask next
```
