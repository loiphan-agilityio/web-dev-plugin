---
name: deploy-setup
description: This skill should be used when the user asks to "set up CI/CD", "set up deployment", "deploy the app to Cloudflare Pages", "run the unit and e2e tests in CI", "add the pipeline from the boilerplate", "update our CI to the boilerplate's" or "move from Netlify to Cloudflare" in a project created from the react-vite-boilerplate. It brings the boilerplate's pipeline into the project at the commit this plugin pins (GitHub Actions running lint, typecheck, unit tests with coverage, build, Storybook, a Cloudflare Pages preview per pull request, Lighthouse, the production deploy, then Playwright e2e on production with an Allure report), runs every gate, then creates the Pages projects and sets the GitHub secret and variables, asking before each command. Not for a project not made from the boilerplate, GitLab or another host, or a pipeline written from scratch.
compatibility: "Claude Code, as part of the web-dev plugin only (runs project-setup's create-project.sh and the plugin's detect-project.mjs). Needs Node 22.22 or newer, pnpm, git, and network access to fetch the boilerplate; the deploy setup needs gh signed in and a Cloudflare account."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/sync-pipeline.mjs *) Bash(pnpm install) Bash(pnpm test:e2e:install) Bash(pnpm check:report)
---

# deploy-setup

Give a project created from the react-vite-boilerplate the boilerplate's CI/CD, unit and e2e test setup and Cloudflare Pages deploy, as they are at the commit this plugin version pins (`../project-setup/scripts/create-project.sh`), then connect it to Cloudflare and GitHub. The files come from the boilerplate itself, never from memory: `scripts/sync-pipeline.mjs` creates a reference project of the same kind (web app or landing page) and copies them from it.

- sync: `node ${CLAUDE_SKILL_DIR}/scripts/sync-pipeline.mjs <root>` (a report, writes nothing), then the same with `--apply`

Run it exactly as written, as one plain command with no pipe or redirect: `allowed-tools` approves that form. It prints JSON:

| Field | Holds |
|---|---|
| `variant` | `auth` (a web app) or `landing` |
| `changes` | `{ path, action, detail }`: `add`, `update` (replaced by the boilerplate's), `remove` (`netlify.toml`), `section` (the root `CLAUDE.md`'s "CI/CD and deploy"), `merge` (`package.json` scripts or devDependencies the pipeline runs, `.gitignore` lines) |
| `kept` | a `package.json` value the project changed, left as it is |
| `blocked` | a file the sync would replace or remove that git cannot restore: uncommitted changes, untracked, or no git repository |
| `leftovers` | other lines that still name Netlify, each with `reference`: the boilerplate's wording of the same place as `-U0` diff hunks |

## 1. The project

The root is the folder with `pnpm-workspace.yaml` and `apps/web` (from `apps/web`, it is `../..`). The script detects the kind and refuses anything else:

- exit 1, `not an app from the boilerplate`: this version covers only projects created from the boilerplate. Change nothing; say so, and offer a new project from it (`project-setup`).
- exit 2: the path is not a project root, or the reference could not be created (no network, no access to the boilerplate): report stderr.

## 2. Report

Run sync without `--apply` and show the user the `changes`, `kept` and `leftovers` in a short list.

- No `changes` and no `leftovers`: the pipeline is already the pinned one; go to step 5.
- `blocked` (exit 1): list the files and stop. Committing or stashing them is the user's call; never do it for them, and never edit around the refusal.

## 3. Apply

Run sync with `--apply`. Then, for each `update` and `section`, read `git diff -- <path>`: the boilerplate's file replaced the project's, so put back what the project had added that the new file does not cover (a `VITE_API_URL` on the build step, a job, an extra Playwright project), on top of the new file. List each one under **Did**.

For each `leftovers` entry, edit those lines to read as its `reference` hunks do (they are the boilerplate's own text for that place). Where the project rewrote the file, change only the lines that name Netlify or `netlify.toml`, to what the reference says about Cloudflare Pages or `public/_headers`. Leave `kept` values alone; name them under **Saw**.

## 4. Gates

From the root, each as a plain command: `pnpm install` (updates the lockfile when `merge` added a devDependency), `pnpm test:e2e:install` (Chromium, once per machine; needs network), then `pnpm check:report`. Put its checklist table in the Result as printed. A failing gate caused by the sync (a file you merged in step 3) is fixed; any other failure is reported, never hidden.

The user asked for the files only: stop here and list step 5 under **Next**.

## 5. Cloudflare and GitHub

Follow `references/cloudflare.md`. Its commands (`npx wrangler`, `gh`) are not in `allowed-tools` on purpose: each one asks first. Never ask for the API token in the chat, never print it, and never write it to a file: the user sets the secret themselves.

Stop before this step, listing it under **Next**, when `origin` is not on GitHub (`git remote get-url origin`; the workflow is GitHub Actions) or `gh auth status` fails.

## 6. Hand over

The sync is a change to the project like any other: offer a feature branch and a commit (`ci: deploy to Cloudflare Pages from the boilerplate's pipeline`, a Conventional Commit, since commitlint rejects anything else), and commit only on a yes. Then `/web-dev:pr` opens the pull request: its CI run deploys the preview (`pr-<number>`) and runs Lighthouse on it; production and the e2e run on it follow the merge to `main`. Tell the user:

- where each report lands: the run's summary page links the app, Storybook, the coverage and the Allure report;
- the e2e tests run once, against production, after the release: a failure there is fixed forward;
- a web app deploys its mock build (`build:mock`) until it has a backend; then the comment above the `Build the app for the deploy` step of `ci.yml` says what to change. A landing page deploys its production build;
- the project's files the sync replaced and step 3 changed again show as `update` the next time it runs: that is expected, and the same review applies.

## Result

```
## Result
**Did:** the variant, the files added, replaced and removed, what was put back from the project's old files, the `pnpm check:report` checklist, and each Pages project, variable and secret set
**Saw:** facts observed: the boilerplate commit, `kept` values, real gate and command output, the preview URL if CI already ran
**Not done:** anything skipped (the Cloudflare and GitHub setup, the ruleset), a failing gate
**Blocked by:** blocked files, a missing sign-in (wrangler, gh), an admin needed for the ruleset, or "nothing"
**Next:** the commit and `/web-dev:pr`, what to set by hand (the API token), the old Netlify site and settings to remove
```
