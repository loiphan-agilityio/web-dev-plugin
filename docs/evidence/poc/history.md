# How the task tracker was built

Each step is one headless Claude Code session (Sonnet, effort medium) in the same folder, with the
four skills copied into `.claude/skills/` and edits auto-accepted. After each session the folder
was committed, so each row is what that session changed. Counts leave out the copied skills.

| Step | Prompt | Skills invoked | Files | Lines | Turns | Cost | Time |
|---|---|---|---|---|---|---|---|
| 1 | [Scaffold](steps/1-skeleton/prompt.md) → [report](steps/1-skeleton/report.md) | `code-skeleton` | 56 | +11,329 (template, lockfile included) | 10 | $0.13 | 1.9 min |
| 2 | [TASK-1 tasks list](steps/2-tasks-list/prompt.md) → [report](steps/2-tasks-list/report.md) | `develop-feature` | 27 | +1,353 −2 | 40 | $0.78 | 4.4 min |
| 3 | [TASK-2 task detail](steps/3-task-detail/prompt.md) → [report](steps/3-task-detail/report.md) | `develop-feature`, `integrate-api` | 24 | +1,344 −19 | 88 | $1.18 | 7.3 min |
| 4 | [TASK-3 dashboard](steps/4-dashboard/prompt.md) → [report](steps/4-dashboard/report.md) | `develop-feature` | 23 | +697 −33 | 73 | $0.82 | 5.9 min |
| — | Two design mockups added as input | — | 2 | | | | |
| 5 | [Match the design](steps/5-design/prompt.md) → [report](steps/5-design/report.md) | `design-to-ui` | 20 | +467 −269 | 81 | $0.98 | 5.2 min |
| — | Demo build (written by hand, not by a skill) | — | 4 | +32 −2 | | | |
| | **Total for the five sessions** | | | | **292** | **$3.89** | **24.7 min** |

Every session reported its gates passing. Steps 1 and 4 also say they could not see a final exit
code for `pnpm check` (read their reports). The gates were then run again, independently, on the
final app, and all five pass: [`pnpm-check.log`](pnpm-check.log).

The only code not written by a skill is the demo build: `src/mocks/demo.ts`, a few lines in
`src/main.tsx` and `src/vite-env.d.ts`, and `dist-demo/` in `.gitignore`. It lets the app run as a
static page with the API answered in the browser, for the live demo.
