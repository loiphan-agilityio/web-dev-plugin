---
name: pr
description: This skill should be used when the user types "/web-dev:pr", asks to "open a PR", "open a pull request for ticket 412", "create a merge request", "raise an MR for this branch" or "send this branch for review". It writes the PR or MR description from the PR contract (why, what changed, the ticket contract it implements, and the pnpm check:report checklist as evidence), checks it with check-contract.mjs, pushes the branch, opens it as a draft with gh or glab, waits for CI and marks it ready for review only when CI passes. Not for writing the ticket contract (ticket), building the feature (feature-development), merging, or reviewing someone else's PR.
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's scripts/. Needs Node 22.22 or newer, git, and gh (GitHub) or glab (GitLab) signed in."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs *) Bash(pnpm check:report) Bash(pnpm -w check:report)
---

# pr

Open one pull request (GitHub) or merge request (GitLab) for the current branch, described by the PR contract in `references/pr.md`: why, what changed, the ticket contract it implements, and the checklist that proves it. It opens as a draft and is marked ready for review only once CI passes on it, so a protected branch (`main`, `dev`, `staging`, `production`…) never gets a reviewable PR whose CI has not passed.

- check: `node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs <body file>`, run from the project root

## 1. Preconditions

Stop and report, changing nothing, when:

- the current branch (`git branch --show-current`) is protected: `main`, `master`, `dev`, `develop`, `stag`, `staging`, `prod`, `production`, or one in `PROTECTED_BRANCHES` (the boilerplate's `pre-push` hook uses the same list). Offer to create a feature branch; never push to a protected one;
- the work tree has uncommitted changes (`git status --short`): list them; committing them is the user's call;
- the host's CLI cannot run: `origin` on GitHub needs `gh auth status` to pass, on GitLab `glab auth status`. On another host, write and check the description (steps 2-4) and stop before step 5.

The **base** is the branch the user names, else the remote's default: `git remote set-head origin --auto`, then `git symbolic-ref --short refs/remotes/origin/HEAD`. After `git fetch origin <base>`, the branch must have commits the base lacks (`git log --oneline origin/<base>..HEAD`). When the branch already has an open PR or MR (`gh pr view --json number,url,isDraft`, `glab mr view`), step 5 updates its description instead of opening another.

## 2. The ticket

The ticket id comes from the user, else the branch name (`feat/412-search`, `docs/ticket-412`), else the commit messages. Its contract is `docs/tickets/<id>/`: `intent.md` (Problem, Outcome) gives **Why**, `spec.md` the criteria this branch covers. Several tickets: name each. A change with no ticket (a dependency bump, a chore, a fix with no issue) says `none: <why>` under **Ticket**. Never invent an id; ask when the branch names a ticket whose folder is missing.

## 3. Gates

`pnpm check:report` at the monorepo root (`pnpm -w check:report` from `apps/web`), as a plain command. A failing gate stops here: report the table and open nothing. Its checklist (the `| Gate | Status | Result | Time |` table and the `All N gates pass.` line) is the evidence, pasted as printed.

## 4. Write and check the description

Write it to `pr-body.md` in a new temporary folder outside the repository (`mktemp -d`), so it is never committed: Claude Code does not write inside `.git/`. Copy the sections of `references/pr.md` in order and replace every `<!-- fill ... -->`:

- **Why:** the problem and the outcome, from the ticket's `intent.md`, in one to three lines; no solution.
- **Changes:** from `git diff --stat origin/<base>...HEAD` and the commits: what changed, by area, one bullet each, and what a reviewer should try. Only what the diff holds.
- **Ticket:** a link to the contract on this branch (GitHub `https://github.com/<owner>/<repo>/blob/<branch>/docs/tickets/<id>/`, GitLab `<project URL>/-/tree/<branch>/docs/tickets/<id>`) and the criteria it covers (`AC-1`, `AC-3`), or `none: <why>`.
- **Evidence:** the checklist from step 3, then `CI: pending`.

The title is a Conventional Commit (`feat(<scope>): <summary>`): a squash merge makes it the commit message, and projects from the boilerplate run commitlint.

Run the check from the project root. It fails on a missing section, a `<!-- fill` marker, evidence with no checklist or with a failing gate, a linked ticket folder that does not exist or whose contract fails its own check, or a cited criterion its spec does not list. Fix the description until it exits 0; exit 2 means it could not run (a wrong path): report it.

## 5. Open as a draft, ready after CI

These commands are not in `allowed-tools` on purpose: each one asks first.

1. `git push -u origin <branch>`. Never `--no-verify` or `--force`.
2. GitHub: `gh pr create --draft --base <base> --head <branch> --title "<title>" --body-file <body>`. GitLab: `glab mr create --draft --target-branch <base> --source-branch <branch> --title "<title>" --description "$(cat <body>)"`. An open one: `gh pr edit <n> --body-file <body>`, `glab mr update <n> --description "$(cat <body>)"`.
3. Wait for CI, in the background since it takes minutes: `gh pr checks <n> --watch`, `glab ci status --live --branch <branch>`.
4. Every check passes: replace `CI: pending` with the run's link, update the description, then `gh pr ready <n>` or `glab mr update <n> --ready`. A check fails, or no CI runs on it: leave the draft as it is, and report the failing checks (or "no CI ran").

Never merge or approve, and never mark ready a PR whose CI failed, is pending or did not run.

## Result

```
## Result
**Did:** <PR or MR URL> | <branch> → <base> | draft or ready | check-contract exit code
**Saw:** the checklist (gates, unit and e2e pass rates, coverage) and the CI run (its link, each check's status)
**Not done:** ready for review, when CI failed, is pending or did not run, and why
**Blocked by:** a failing gate or check, a missing ticket contract, or "nothing"
**Next:** review and merge on the host; after a red CI, fix, push and run `/web-dev:pr` again to refresh the description
```
