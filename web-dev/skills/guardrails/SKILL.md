---
name: guardrails
description: This skill should be used before Claude runs anything outward-facing or hard to undo in a web-dev project - git push, a commit on a protected branch, changing or undoing a commit ("fix", "reword" or "edit the last commit message", "undo my last commit", squash, "clean up the history", git reset, rebase, --amend), --force or --no-verify, discarding changes, deleting a branch, approving or merging a pull request, deploying, setting a CI secret or variable, or reading .env files and keys - and when the user types "/web-dev:guardrails" or asks "what are you allowed to do", "what needs my approval" or "push this to main". It lists which rules are blocked by code, which a skill checks and which are only written down, and stops to ask the user instead of acting. Not for building features (feature-development), opening a pull request (pr) or setting up CI/CD (deploy-setup).
compatibility: "Claude Code, as part of the web-dev plugin: its hook (hooks/hooks.json) runs the plugin's scripts/guard.mjs before each Bash, Read, Edit and Write. Needs Node 22.22 or newer."
---

# guardrails

Anything outward-facing or hard to undo stays with the user. Before such an action, find it in the table, follow its rule, and when the rule says ask, ask in one message and wait: an earlier yes covers only the action it was given for.

## Rules

| Rule | Enforced by | Strength |
|---|---|---|
| `git push`, `gh`, `glab` and `npx wrangler` ask the user first | each web-dev skill's `allowed-tools` lists only its own scripts and pnpm commands, so anything else prompts | Blocked by code (unless permissions are bypassed) |
| No push to `main`, `master`, `dev`, `develop`, `staging`, `production` or a branch in `PROTECTED_BRANCHES` | the boilerplate's `pre-push` hook, and branch protection on the server | Blocked by code |
| Commit messages follow Conventional Commits; staged files pass lint | the boilerplate's husky `commit-msg` (commitlint) and `pre-commit` hooks | Blocked by code |
| `deploy-setup` never replaces a file git cannot restore | `sync-pipeline.mjs` reports it under `blocked` and exits 1 | Blocked by code |
| Ticket, incident and PR documents have every section, and every criterion has a task | `check-contract.mjs` | Blocked by code |
| No `git commit --amend`, `reset --hard`, `rebase`, force-push or remote branch delete, skipping the hooks (`--no-verify`, `-n`, `HUSKY=0`, `core.hooksPath`), `branch -f`, `-D` or `-M` | the plugin's PreToolUse hook, `../../scripts/guard.mjs` (with its own tests) | Blocked by code |
| No reading, editing or overwriting `.env*`, `.envrc`, `.dev.vars`, `.npmrc`, keys or certificates (creating a new one from `.env.example` is fine) | the same hook, on Read, Edit, Write, Grep, shell readers, redirects and `cp`; a script, an alias or a recursive `grep -r` still gets through | Blocked by code |
| No approving or merging a PR; it stays a draft until CI passes | `pr` | Checked by a skill |
| Commit only on a new branch, staging only the files of the change; push only when the user asks | `ticket`, `incident`, `pr` | Checked by a skill |
| Never ask for, print or write the Cloudflare API token: the user sets the secret | `deploy-setup` | Checked by a skill |
| An open question (it changes data, a business rule or the API) is asked, never guessed | `feature-development`, `ticket` | Checked by a skill |
| No new dependency in a project not made from the boilerplate; a new font or palette change only when the user agrees | `develop`, `ui-development` | Checked by a skill |
| A bug fix comes with a failing test first; never change a test or a gate only to make a check pass | this skill | Written rule |

The guardrails stop mistakes, not someone determined to get around them. The real lock on a protected branch is branch protection on the server.

## Before an action

1. **Find the action** in the table. Not there, but it publishes something, deletes data, rewrites history or touches a secret: treat it as a written rule.
2. **Blocked by code:** do not try another route around the block (another command, a flag, a script, a hook skip, a different remote). When the hook refuses a command (`Blocked by the web-dev guardrails: ...`), say so and give the safe alternative of step 4.
3. **Checked by a skill:** follow that skill's step; it already says when to ask.
4. **Written rule:** do not do it. Say why in one line and offer the safe alternative: a new branch instead of a protected one, a new commit instead of `--amend`, `git revert` instead of `reset`, the user reading a secret instead of Claude.
5. **The user asks for it anyway:** a written rule stays with the user. Give them the exact command to run themselves, in its own `bash` block, and do not run it.

## Result

```
## Result
Asked for: <the action>
Rule: <the row> (<strength>)
Done: <nothing | what was done instead>
For you to run: <the command, or none>
```
