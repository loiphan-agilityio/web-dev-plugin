---
name: release
description: This skill should be used when the user types "/web-dev:release", asks to "release this", "ship it to production", "deploy to production", "go live", "tag a release", "tag this commit as v1.1.0", "push the tag", "create a version tag", "cut v1.4.0", "roll back production", "undo the last release" or "is it live yet" in a project created from the react-vite-boilerplate whose CI/CD deploys to Cloudflare Pages. It checks the pull request's preview and CI, hands the merge to the user, follows the main run until production is live and its e2e pass, tags the merged commit when asked, and rolls back through a revert pull request. It never merges, approves, pushes to main or deploys production itself. Not for setting up CI/CD (deploy-setup), opening the pull request (pr) or auditing the live site (web-quality).
compatibility: "Claude Code, as part of the web-dev plugin; its gate is the plugin's guardrails hook. Needs git, gh signed in, and a project whose CI/CD came from the boilerplate (deploy-setup)."
---

# release

A project from the boilerplate has two places a build goes, from one codebase and one pipeline (`.github/workflows/ci.yml`):

| | Preview | Production |
|---|---|---|
| When | every pull request, and every push to `main` (`main-draft`) | a push to `main`, once Lighthouse passes on its preview |
| Where | `pr-<number>.<app project>.pages.dev`, `main-draft.<app project>.pages.dev` | the app project's production address |
| Jobs | `Checks: lint, typecheck, unit, build`, `Deploy: preview`, `Lighthouse: deployed preview` | the same, then `Deploy: production`, then `E2E: production` on the live site |
| Who starts it | pushing a branch | **the merge of the pull request: a person's decision** |

Production serves exactly the files the preview of the same commit served: CI deploys the `app` artifact `check` built, nothing is rebuilt. So a release is the merge, and everything before it is about making the merge safe.

## The release gate

What may run, and who decides. The guardrails hook (`../../hooks/hooks.json`, `../../scripts/guard.mjs`) refuses every "blocked" row before it runs; the rest are not in `allowed-tools`, so each asks the user first.

| Command | Preview | Production |
|---|---|---|
| `git push -u origin <branch>` | asks you | — |
| `npx <wrangler> pages deploy ... --branch <not main>` | asks you | — |
| `npx <wrangler> pages deploy ... --branch main`, or without `--branch` | — | **blocked**: production deploys only from CI, after the merge |
| `gh workflow run ci.yml`, `gh run rerun <id>` | asks you | asks you |
| `git push origin v1.4.0` | — | allowed only for a commit already on `origin/main`; `--tags` is blocked |
| Rollback: a revert pull request | asks you | asks you; the merge stays yours |
| `pages deployment delete` | **blocked** | **blocked** |
| Pushing to `main` (or `master`, `dev`, `staging`, `production`…), `gh pr merge`, `gh pr review --approve`, `glab mr merge`, `glab mr approve` | **always blocked**: the merge is the approval, so it is a person's decision | |

`<wrangler>` is the `WRANGLER:` value at the top of the project's `ci.yml`. Never route around a blocked row (another command, the API, a dashboard click, a different remote): say what was blocked and hand the user the step.

## 1. Preconditions

Stop and report, changing nothing, when:

- the folder is not a project from the boilerplate with its pipeline: `.github/workflows/ci.yml` has no `Deploy: production` job. Offer `deploy-setup`;
- `gh auth status` fails, or `origin` is not on GitHub: the pipeline is GitHub Actions;
- the variable `CLOUDFLARE_PAGES_APP_PROJECT` is not set (`gh variable list`): CI skips every deploy, so nothing would go live. Offer `deploy-setup`.

The user's words pick the path: going live (steps 2 to 4), a tag (step 5), a rollback (step 6), or "is it live" (step 4 alone).

## 2. The pull request

The branch to release has an open pull request into `main` (`gh pr view --json number,url,state,isDraft,headRefOid,baseRefName`). Without one, offer the `pr` skill and stop. Then read its checks (`gh pr checks <number>`):

- every required check passed on the head commit, `Deploy: preview` included, and `Lighthouse: deployed preview` passed (accessibility 100, SEO 95 or more). A pending check: say which and stop; never mark a check or a PR as something it is not;
- the preview address: the link of the `Preview - Webapp Deployment` status (`gh pr view <number> --json statusCheckRollup`). Name it, so the user can open what will go live;
- still a draft: CI has not passed on it, or the `pr` skill left it a draft for a reason. Say so; marking it ready is the `pr` skill's step.

When the project has a `CHANGELOG.md`, the release's entry belongs in this pull request, before the merge: offer to add it on the branch (a commit, then `git push`, which asks).

## 3. Hand over the merge

Write the release in one message: the pull request, its preview address, the checks, the commits that go out (`git log --oneline origin/main..<head>`, after `git fetch origin main`), and anything that changes for users. Then hand over: "Merge it on GitHub (squash) when you are ready; production deploys from that merge." Do not merge, approve, or push `main`, even when asked: the hook refuses, and it is the user's decision. Wait for the user to say it is merged.

## 4. Follow it to production

Once merged, the push to `main` starts a run. Find it (`gh run list --branch main --workflow ci.yml --limit 1 --json databaseId,headSha,status,conclusion`) and check its `headSha` is the merge commit (`gh pr view <number> --json mergeCommit`). Follow it once (`gh run watch <id> --exit-status`), then report each job:

- `Checks: lint, typecheck, unit, build`, `Deploy: preview` (`main-draft`), `Lighthouse: deployed preview`, `Deploy: production` (its status `Prod - Webapp Deployment` links the live site), `E2E: production` (Playwright on the live site, with its Allure report);
- a job that failed before `Deploy: production`: nothing went live, production still serves the last release. Report the failing job and its log lines (`gh run view <id> --log-failed`);
- `E2E: production` failed after `Deploy: production`: the new release is live and failing. Say so first, then offer step 6 (roll back) or a fix in a new pull request; which one is the user's call.

"Is it live" without a merge just now: the same report for the last run on `main`.

## 5. Tag the release (when asked)

Only a merged commit gets a tag: `git fetch origin main`, then the tag on the merge commit (`git tag -a v<version> <merge sha> -m "v<version>"`) and `git push origin v<version>` (asks; the hook refuses it unless the commit is on `origin/main`). The version is the user's; propose one from the commits since the last tag (`git describe --tags --abbrev=0`; a `feat` is a minor bump, a `fix` a patch, a `!` or `BREAKING CHANGE` a major). A tag starts no deploy in this pipeline: it only names the release. Never move or delete a pushed tag.

## 6. Roll back

The live site comes from `main`, so the rollback goes through `main` too:

1. `git fetch origin main`, a branch from it (`git switch -c revert/<short sha> origin/main`), `git revert --no-edit <merge sha>` (a new commit; never `reset` or a force-push), `git push -u origin revert/<short sha>`, and a pull request with the `pr` skill, its title starting with `revert:`.
2. Its preview is the previous release: name its address, so the user can check it.
3. Hand over the merge as in step 3, then follow it as in step 4.

When production must change before CI can run, the user can promote an earlier deployment on the Cloudflare dashboard (Workers & Pages > the app project > Deployments; the earlier deployment's menu; read the page before acting, since the dashboard changes). That is the user's click, not Claude's, and wrangler has no command for it. After it, `main` no longer matches the live site until the revert pull request is merged: say so.

## Result

```
## Result
Asked for: <release | tag | rollback | status>
Pull request: <url> · preview <url>
Checks: <job: pass/fail/pending, one per line>
Production: <live at <url> from <sha> | not yet: waiting for the merge | not live: <job> failed>
e2e on production: <pass n/n, Allure <url> | failed: <test> | not run>
Tag: <v<version> on <sha> | none>
Blocked by: <the gate row, or none>
Next: <the user's step: merge, check the preview, roll back, ...>
```
