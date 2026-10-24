---
name: incident
description: This skill should be used when the user types "/web-dev:incident <id>", asks for "an incident report", "a postmortem", "a root cause analysis for the outage" or "write up what broke in production". It writes docs/incidents/<id>/report.md, rca.md and actions.md from the facts given and found (logs, alerts, the change that shipped, CI runs), each claim labelled measured or hypothesis, checks them with check-contract.mjs and commits them on a branch; its follow-ups can become ticket contracts. Not for the fix itself (this version does not fix bugs), a feature ticket (ticket), or code review.
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's scripts/. Needs Node 22.22 or newer and git."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs *) Bash(mkdir -p *)
---

# incident

Write the record of one incident in `docs/incidents/<id>/`: what happened (`report.md`), why (`rca.md`) and what changes so it does not happen again (`actions.md`). It is blameless: it names changes, gates and alerts, never people at fault. The templates are in `references/`: copy their sections in order and replace every `<!-- fill ... -->` comment.

- check: `node ${CLAUDE_SKILL_DIR}/../../scripts/check-contract.mjs docs/incidents/<id>`

## 1. Gather the facts

The **id** is the user's (`INC-12`, a date such as `2026-10-24-login-down`); ask when there is none. Then collect, quoting each with its source:

- what the user gave: alerts, logs, error messages, screenshots, a timeline, user reports;
- the change that shipped: `git log --since=<start> --oneline`, the suspect commit's diff, its PR or MR;
- the pipeline: the CI run and deploy that carried it (`gh run view <id>` or `glab ci view`), when the user points at one.

Ask once, in one message, for what the record cannot be written without: when it started, who or what was affected, and whether it is still happening. A fact nobody has is written as `unknown` with how to find out, never estimated.

## 2. Write the record

- **report.md:** times in UTC; impact in measured numbers with their source; **Status** starts with `open`, `mitigated` or `resolved`.
- **rca.md:** label each claim **measured** (a log line, a diff, a metric) or **hypothesis** (what would confirm it). The root cause is the defect the team can change (a missing check, a config, a race), with the file or commit that holds it; the trigger is what set it off.
- **actions.md:** the fix that resolved it (or what is left), then follow-ups `- [ ] A<n> ...`, each one action with an owner (`unassigned` until someone takes it). Prefer a test, a type, a lint rule or a gate that makes the root cause impossible or caught, and an alert that pages within minutes, over "be careful".

## 3. Check

Run the check. It fails on a missing file or section, a `<!-- fill` marker left, a Status that is not `open`, `mitigated` or `resolved`, or no `A<n>` follow-up. Fix the record until it exits 0; exit 2 means it could not run (a wrong path): report it.

## 4. Commit, and push only when asked

Commit on a branch, never on `main`, `dev`, `staging` or `production`: `git switch -c docs/incident-<id>`, `git add docs/incidents/<id>`, `git diff --cached --name-only` to confirm only those files, then `git commit -m "docs(incident): report, rca and actions for <id>"`. Push and open a PR or MR only when the user asks; git commands are not in `allowed-tools` on purpose.

Offer to write the follow-ups as ticket contracts: `ticket` writes several in parallel, and each `A<n>` then names its ticket.

## Result

```
## Result
**Did:** docs/incidents/<id>/ written; status; root cause in one line; follow-ups count; the check outcome
**Saw:** the measured facts the record rests on, with their sources
**Not done:** facts still unknown, hypotheses not yet confirmed, the push (unless asked)
**Blocked by:** questions only the user can answer, or "nothing"
**Next:** confirm the hypotheses, assign the follow-ups, write them as tickets with `/web-dev:ticket`
```
