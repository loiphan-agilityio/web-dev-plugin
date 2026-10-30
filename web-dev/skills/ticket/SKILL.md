---
name: ticket
description: This skill should be used when the user types "/web-dev:ticket <id>", asks to "write the contract for ticket 412", "write intent, spec and plan for this issue", "turn these issues into specs", or gives several tickets to write up at once. It writes docs/tickets/<id>/intent.md, spec.md and plan.md from the issue (gh or glab) or the pasted text, grounded in the project's code, checks them with check-contract.mjs and commits them on a branch for review; several tickets are written in parallel, one subagent each. Not for building the feature (feature-development reads the contract), an incident write-up (incident), or a whole new app (develop).
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's scripts/. Needs Node 22.22 or newer and git; gh or glab to read an issue by its number."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs *)
---

# ticket

`allowed-tools` approves this skill's commands only in the turn it is loaded. In any later turn (the user's answer to its question, or a subagent's or background task's result), load it again first (Skill tool, `web-dev:ticket`, with what arrived as args), then go on: its commands otherwise ask for permission.

Write the contract for one ticket or several: three files in `docs/tickets/<id>/` that say why (`intent.md`), what, testably (`spec.md`) and how, in build order (`plan.md`). The contract is reviewed before any code, and `feature-development` builds from it. The templates are in `references/`: copy their sections in order and replace every `<!-- fill ... -->` comment.

Run the check exactly as written, `${CLAUDE_SKILL_DIR}/../../` included, as one plain command with no pipe or redirect: `allowed-tools` approves that exact form, and a shortened or resolved path asks for permission.

- check: `node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs docs/tickets/<id>`

## 1. Collect the tickets

For each ticket, an **id** and its **text**:

- an issue number or URL: `gh issue view <n> --comments` (GitHub) or `glab issue view <n> --comments` (GitLab), run from the project root; the folder is the number (`docs/tickets/412/`);
- a key from another tracker (`PROJ-412`) with the text pasted: the folder is the key as given;
- text with no id: ask for one; never invent a number.

A ticket whose folder already holds a contract is updated in place, not rewritten: keep its ticked items and answered questions.

## 2. Write each contract

Before writing, read the project's `CLAUDE.md` (and `apps/web/CLAUDE.md` in a monorepo) and the code the ticket touches: the entities, endpoints, routes and feature folders it names. The contract describes this project, not a generic one.

- **intent.md:** the problem in the user's terms, with the evidence the ticket gives; no solution.
- **spec.md:** each acceptance criterion as `- [ ] AC-<n> Given ..., when ..., then ...`, one behaviour each, so a test can pin it. Sort every gap as `feature-development` does (its step 1): a gap that changes data, a business rule or the API contract goes under **Open questions**, naming the criterion it blocks; never guess it. Data and API list only what this ticket adds or changes, against the existing code.
- **plan.md:** tasks `- [ ] T<n> ...` in build order, each citing the criteria it covers (`(AC-1, AC-3)`) and what it depends on; mark `parallel` on a task that touches no file of another open task. **Files** are real paths in the project's layout (`src/features/<name>/...`). **Gates:** in a project from the boilerplate, `pnpm check:report` at the monorepo root (`pnpm -w check:report` from `apps/web`; its checklist is the evidence), else the project's own lint, test and build commands.

### Several tickets: in parallel

With two or more tickets, write each in its own subagent (Agent tool, `general-purpose`), all started in one message, at most five at a time. They are safe to run together: each writes only its own `docs/tickets/<id>/`. Give each a self-contained brief, since it does not see this conversation:

- the project's absolute path, the ticket's id and full text;
- the absolute paths of the three templates (`${CLAUDE_SKILL_DIR}/references/intent.md`, `${CLAUDE_SKILL_DIR}/references/spec.md`, `${CLAUDE_SKILL_DIR}/references/plan.md`) and the check's rules from step 3;
- the rules of this step 2, and: write only `docs/tickets/<id>/`, never code, never commit;
- do not run the check script (a subagent does not get this skill's `allowed-tools`, so it would ask for permission); done when the three files follow the templates and step 3's rules; report the files and the open questions.

The check runs here, not in the subagents: run it yourself on every folder when they report, and fix or re-brief any that fails.

## 3. Check

Run the check on each folder. It fails on a missing file or section, a `<!-- fill` marker left, a spec with no `AC-<n>`, a plan with no `T<n>`, or a criterion no task cites. Fix the contract until it exits 0; exit 2 means it could not run (a wrong path): report it.

## 4. Commit, and push only when asked

The contract goes through review like code. Commit it on a branch, never on `main`, `dev`, `staging` or `production`:

1. `git switch -c docs/ticket-<id>` (one ticket) or `docs/tickets-<first id>-<last id>`, unless the user is on a feature branch for this work;
2. `git add docs/tickets/<id>` for each contract, and `git diff --cached --name-only` to confirm only those files;
3. `git commit -m "docs(ticket): intent, spec and plan for <id>"` (a Conventional Commit: projects from the boilerplate run commitlint).

Push (`git push -u origin <branch>`) only when the user asks, and open a PR or MR with the `pr` skill when they ask for one; a project from the boilerplate refuses a push to a protected branch in its `pre-push` hook. These git commands are not in `allowed-tools` on purpose: each one asks first.

## Result

```
## Result
**Did:** one row per ticket: id | folder | criteria | tasks | open questions | check
**Saw:** facts from the code that shaped the contracts (existing endpoints, entities, routes)
**Not done:** a ticket without text or id, a check that still fails, the push (unless asked)
**Blocked by:** the open questions, by ticket and criterion, or "nothing"
**Next:** answer the open questions, review the branch, then build one with `/web-dev:develop implement ticket <id>`
```
