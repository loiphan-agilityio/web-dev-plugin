# How the task tracker was built

Each step is one headless Claude Code session (Sonnet, effort medium) in the same folder, with the
skills copied into `.claude/skills/` and edits auto-accepted. After each session the folder was
committed, so each row is what that session changed. Counts leave out the copied skills and
companions. This is the rebuild of 2026-10-21, with the skills at commit `d285b1f`.

| Step | Prompt | Skills invoked | Files | Lines | Turns | Cost | Time |
|---|---|---|---|---|---|---|---|
| 1 | [Scaffold](steps/1-skeleton/prompt.md) → [report](steps/1-skeleton/report.md) | `code-skeleton` | 57 | +11,454 (template, lockfile included) | 13 | $0.16 | 5.8 min |
| 2 | [TASK-1 tasks list](steps/2-tasks-list/prompt.md) → [report](steps/2-tasks-list/report.md) | `develop-feature` | 26 | +1,378 −2 | 42 | $0.88 | 6.2 min |
| 3 | [TASK-2 task detail](steps/3-task-detail/prompt.md) → [report](steps/3-task-detail/report.md) | `develop-feature`, `integrate-api` | 25 | +1,393 −45 | 69 | $1.13 | 7.6 min |
| 4 | [TASK-3 dashboard](steps/4-dashboard/prompt.md) → [report](steps/4-dashboard/report.md) | `develop-feature`, `integrate-api` | 24 | +758 −32 | 56 | $0.92 | 8.0 min |
| — | Two design mockups added as input | — | 2 | | | | |
| 5 | [Match the design](steps/5-design/prompt.md) → [report](steps/5-design/report.md) | `design-to-ui` | 20 | +461 −251 | 80 | $1.02 | 7.2 min |
| | **Total for the five sessions** | | | | **260** | **$4.11** | **34.8 min** |

No session excluded a criterion or reported being blocked. The gates were then run again,
independently, on the final app: lint (with Prettier), typecheck, 135 tests at 97.1% line
coverage, build and Storybook build all pass ([`pnpm-check.log`](pnpm-check.log)). Step 5 could not
check the result in a browser (headless) and estimated the brand colors by eye.

## Permissions

A headless run does not apply the allow rules in the project's `.claude/settings.json`. Step 1
ran with `--allowedTools` for the scaffold scripts; steps 2–5 ran with
`--settings .claude/settings.json`, the allow-list the scaffold wrote. An earlier attempt the same
day without `--settings` got every `pnpm` command refused: no session could run its gates, and the
app it left failed lint and typecheck. That run is what led to the fixes in commit `5b7f036`
(explicit `useForm` types, plain gate commands, braces on void handlers) and `d285b1f` (build the
literal reading of a stated rule instead of excluding it).

## Compared with the first build (2026-10-20)

| | First build | Rebuild |
|---|---|---|
| Cost / time | $3.89 / 24.7 min | $4.11 / 34.8 min |
| Tests / line coverage | 131 / 97.8% | 135 / 97.1% |
| `integrate-api` used for the stats endpoint | no | yes |
| Criteria built on a guess and reported as blocked | 2 steps | none |

The screenshots, the recording and the live demo in this folder are from the first build. No
code in the rebuild was written by hand.
