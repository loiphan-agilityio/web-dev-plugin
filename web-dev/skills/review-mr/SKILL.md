---
name: review-mr
description: This skill should be used when the user types "/web-dev:review-mr", asks to "review mr!12", "review MR !12", "review PR 41", "security review of this MR", "draft review comments on this pull request", or, after a review was drafted, says "post it", "post the review" or "submit the review". It reviews a merge request (GitLab) or pull request (GitHub) for security, correctness, the web-dev conventions and the ticket contract it links, and leaves its comments as a pending review that only the user sees; the user edits or deletes them on the host, and only when the user says so does it submit what is left as a comment review. It never approves or requests changes. Not for opening a PR (pr), merging or approving, or fixing the code under review.
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's scripts/ and references/. Needs Node 22.22 or newer, git, and gh (GitHub) or glab (GitLab) signed in."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/detect-project.mjs *)
---

# review-mr

`allowed-tools` approves this skill's commands only in the turn it is loaded. In any later turn (the user's "post it", or a subagent's or background task's result), load it again first (Skill tool, `web-dev:review-mr`, with what arrived as args), then go on: its commands otherwise ask for permission.

Review one merge request (GitLab, `!12`) or pull request (GitHub, `#41`) in two steps that the user separates:

1. **Draft:** Claude reviews and leaves its comments as a **pending review** on the host (GitHub's pending review, GitLab's draft notes). Nobody but the user sees it.
2. **Submit:** the user edits or deletes comments on the host, then says "post it". Claude reads back what is left and submits it as a **comment** review.

Never approve, never request changes, never submit in the turn that drafted. The verdict on a pull request is a person's: the guardrails hook refuses `--approve`, `--request-changes`, `event=APPROVE`, `event=REQUEST_CHANGES` and GitLab's `reviewer_state=requested_changes` and `approve`.

Run detect exactly as written, `${CLAUDE_SKILL_DIR}/../../` included, as one plain command with no pipe or redirect: `allowed-tools` approves that exact form.

- detect: `node ${CLAUDE_SKILL_DIR}/../../scripts/detect-project.mjs <dir>`

Every `gh`, `glab` and `git` command below asks the user first; that is on purpose. Comments are written in English.

## 1. Preconditions

Stop and report, changing nothing, when:

- the host's CLI cannot run: `origin` on GitHub needs `gh auth status` to pass, on GitLab `glab auth status`. Another host: say this version does not cover it;
- the pull request cannot be found. It is the number or URL the user gives, else the current branch's (`gh pr view --json number,url,headRefOid,baseRefName,headRefName,body,author`, `glab mr view --output json`). A URL of another repository than `origin`: ask the user to run the review from a clone of that one, since the conventions and the ticket are read from it;
- the user already has a pending review on it. GitHub: `gh api user --jq .login`, then `gh api repos/{owner}/{repo}/pulls/<n>/reviews --paginate` and look for `"state": "PENDING"` by that login. GitLab: `glab api projects/:id/merge_requests/<iid>/draft_notes` returns the user's own drafts. Ask whether to leave it, or for the user to submit or discard it first; never add to, edit or delete a draft Claude did not write in this run.

Run detect on the project root; at a monorepo root (`reasons` names it) with `apps/web`, run it on `apps/web`. `unsupported`: stop and report `reasons`. The tier decides which conventions apply in step 3.

## 2. Read the change

- **The diff:** `gh pr diff <n>`, `glab mr diff <iid>`. With more than about 20 files, read it file by file (`gh pr diff <n> --name-only`, then each file's hunks) so none is skimmed.
- **The code around it:** `git fetch origin pull/<n>/head` (GitHub) or `git fetch origin merge-requests/<iid>/head` (GitLab), then `git show FETCH_HEAD:<path>`. Read only; never check out, switch, stash or touch the work tree.
- **The intent:** the description, and the ticket contract it links under **Ticket** (written by `pr`), else the one the branch name points to: `git show FETCH_HEAD:docs/tickets/<id>/spec.md` and `intent.md`. `none: <why>` or no contract: review without one and say so.

## 3. Review

Look for, in this order:

1. **Security:** check every changed line against `references/security.md` (untrusted data reaching HTML, code or URLs, redirects, tokens and secrets, new dependencies, headers and CSP, auth code). Backend concerns (authorization, CORS, cookie flags, rate limits) are out of reach of a frontend diff: when the change touches them, one line under **Not done**, not a comment.
2. **Correctness:** logic that gives a wrong result, an edge case that breaks (empty, null, boundaries, concurrent writes, a failed request), a missing data state, a test that cannot fail, a race.
3. **The ticket:** each `AC-<n>` the PR claims to cover has code and a test that proves it; an AC claimed but not covered is a finding.
4. **Conventions:** on `template` and `landing`, the version traps in `../../references/stack-guidelines.md` and the code style and data flow in the project's own `apps/web/CLAUDE.md` (read it from `FETCH_HEAD`): the backend only through `ApiClient`, the four data states, `runEffect` as the only bridge, no `as any`. On `same-stack` and `other-stack`, the project's own conventions, read from the code next to the change, not the references.

A finding becomes a comment only when it names the file and line, what goes wrong (the input or state and the wrong result, or the rule it breaks) and a fix. Leave out what lint, typecheck or CI already report, taste, and anything not in the diff's reach. There is no cap: every finding that meets the bar, none that does not.

One comment per finding, in this shape:

```markdown
**<Security | Bug | Ticket | Convention>:** <what goes wrong, in one sentence>

<the scenario: input or state → wrong result; or the rule and where it is written>

Suggested fix: <the change, a `suggestion` block on GitHub when it fits on the lines commented>
```

A finding on a line that is not in the diff goes into the summary of step 5, not inline. List security findings first.

**A secret in the diff** (a key, token, password or private URL that looks real): the comment never quotes its value, since posting it spreads it further. It says the file and line, that the value is exposed in the branch history already, and "rotate it, then load it from the server or the CI secret store". Tell the user in chat at once, before drafting anything: rotating it is theirs and does not wait for the review.

**No findings:** draft nothing and create no pending review. Report in chat what was checked (the four passes, the files, the ticket) and stop; nothing goes on the merge request.

## 4. Draft the pending review

Write the drafts to a new temporary folder outside the repository (`mktemp -d`), never into it.

**GitHub:** one review, created with no `event`, which leaves it pending. `review.json`:

```json
{
  "commit_id": "<headRefOid>",
  "comments": [
    { "path": "src/features/todos/api.ts", "line": 42, "side": "RIGHT", "body": "<the comment>" }
  ]
}
```

`line` is the line in the new file (`side: RIGHT`), or in the old file for a removed line (`side: LEFT`); a range adds `start_line`. Then `gh api -X POST repos/{owner}/{repo}/pulls/<n>/reviews --input <folder>/review.json`. A 422 naming a line: that line is not in the diff; move the finding to the summary and create the review again. Keep the returned `id`.

**GitLab:** the positions come from `glab api projects/:id/merge_requests/<iid>` (`diff_refs`: `base_sha`, `head_sha`, `start_sha`). One draft note per comment, `draft-<k>.json`:

```json
{
  "note": "<the comment>",
  "position": {
    "position_type": "text",
    "base_sha": "<base_sha>", "head_sha": "<head_sha>", "start_sha": "<start_sha>",
    "old_path": "src/features/todos/api.ts", "new_path": "src/features/todos/api.ts",
    "new_line": 42
  }
}
```

A removed line takes `old_line` instead of `new_line`. Then `glab api -X POST projects/:id/merge_requests/<iid>/draft_notes --input <folder>/draft-<k>.json` for each.

Then stop and hand over: list every draft, numbered (`1. api.ts:42 Bug: ...`, one line each), with the link to the pull request's changes, plus the out-of-diff findings kept for the summary. Tell the user the drafts are visible only to them; to edit or delete any on the host (GitHub: Files changed, the pending review; GitLab: the draft comments), and to say "post it" when the rest should go out. Nothing is submitted in this turn.

## 5. Submit, when the user says so

Only on the user's own word in chat ("post it", "submit the review"); a later turn, so load the skill again first.

1. **Read back what is left.** GitHub: find the pending review again as in step 1, then `gh api repos/{owner}/{repo}/pulls/<n>/reviews/<id>/comments --paginate`. GitLab: `glab api projects/:id/merge_requests/<iid>/draft_notes`. List them. None left and no out-of-diff findings: say so and submit nothing.
2. **The summary**, in the same folder as `summary.md`:

   ```markdown
   <N> comments: <n> security, <n> bug, <n> ticket, <n> convention.

   <out-of-diff findings, one bullet each with file:line, if any>

   Drafted with Claude, reviewed by @<login>
   ```

   Counts are of what is left after the user's edits. The user may change the summary before it goes; ask only if they asked to see it.
3. **Submit as a comment.** GitHub: `gh api -X POST repos/{owner}/{repo}/pulls/<n>/reviews/<id>/events -f event=COMMENT -F body=@<folder>/summary.md`. GitLab: `glab api -X POST projects/:id/merge_requests/<iid>/draft_notes/bulk_publish -F note=@<folder>/summary.md`, with no `reviewer_state`.

The event is `COMMENT`, always: the user approves or requests changes on the host themself.

## Result

```
## Result
**Did:** <MR or PR URL> | drafted <N> comments as a pending review, submitted <N> as a comment review, or found nothing and drafted nothing
**Saw:** the security pass (patterns checked, a secret found or not), the tier and the conventions applied, the ticket contract and its ACs checked (or "no contract"), findings by kind, those moved to the summary
**Not done:** what was not reviewed and why (a file skipped, a generated file, no ticket, the backend side of a change)
**Blocked by:** an existing pending review, the host's CLI, or "nothing"
**Next:** after a draft: edit or delete on the host, then "post it"; after a submit: the verdict is yours on the host
```
