# One message, whole app

The `build-app` skill (plugin 0.2.0) given one description and nothing else. One headless Claude
Code session (Sonnet, effort medium) in an empty folder with the five skills in `.claude/skills/`,
edits auto-accepted, and the scaffold's command allow-list passed with `--settings` (a headless
run does not apply a project's allow rules, because the folder was never trusted).

| | |
|---|---|
| Prompt | [`prompt.md`](prompt.md): one sentence, no ticket |
| Plan the skill wrote | [`docs/plan.md`](../../../examples/library-manager/docs/plan.md): 3 entities, 12 endpoints, 4 tickets, mock data, 10 assumptions |
| Session | success, $3.35, 24.7 min, 168 turns, no question asked; 5 commands refused (long `cd` chains) |
| Its report | [`report.md`](report.md) |
| Result | [`examples/library-manager/`](../../../examples/library-manager/): loans, books, members, overview |
| Gates, run again independently | [`pnpm-check.log`](pnpm-check.log): lint (with Prettier), typecheck, 141 tests at 96.5% line coverage, build, Storybook build: **pass** |

## What it did not do

- No visual check: a headless session has no browser, and no design was given.
- The session read the `code-skeleton` and `develop-feature` skill files and followed them,
  instead of invoking them through the Skill tool as `build-app` says. The steps and the result
  are the same.
- Sign-in, fines, renewals and reminders are out of scope by the skill's defaults; the plan says
  so under Assumptions.
