# Evidence

Everything here was produced by running the code. Logs differ from the terminal only in two ways:
color codes are stripped and local paths are replaced by `<tmp>` or `<app>`.

| What | Where | Result |
|---|---|---|
| The template on a fresh scaffold (same script as CI) | [`verify-sh.log`](verify-sh.log) | Lint, typecheck, 25 tests, build, Storybook build: **pass** |
| A task tracker built by the skills, one session per ticket | [`poc/history.md`](poc/history.md) | 5 sessions, $3.89, 25 minutes |
| The final app, gates run independently | [`poc/pnpm-check.log`](poc/pnpm-check.log) | Lint, typecheck, 131 tests (97.8% lines), build, Storybook build: **pass** |
| Live demo | [Task Tracker Demo](https://claude.ai/artifact/Mbff8zeHWzLnjDKVdhmeSA) | Static build, API answered in the browser |
| Screenshots, a recording, mobile views, 32 Storybook states | [`poc/screens/`](poc/screens/) | Below |
| One-page summary | [Web App Skills Report](https://claude.ai/artifact/WsEMWexLj3kYAuvJ8jrvxX) | |

## The design and the result

`design-to-ui` restyled the app from two mockups (left). The results are on the right, taken from
the running app.

| Mockup | Built by the skills |
|---|---|
| ![Dashboard mockup](../../examples/task-tracker/design/dashboard.png) | ![Dashboard](poc/screens/01-dashboard.png) |
| ![Tasks mockup](../../examples/task-tracker/design/tasks.png) | ![Tasks](poc/screens/02-tasks.png) |

Differences it reported itself (from [its report](poc/steps/5-design/report.md)): colors are
estimated by eye, "To do" and "Due this week" are not shown on the dashboard because the mockup
has four cards, and the due date stays a native date input.

## The user journey

[`journey.webm`](poc/screens/journey.webm) records the whole journey in one take. The screenshots
are its steps:

| | |
|---|---|
| ![Filter: in progress](poc/screens/03-tasks-filter-in-progress.png) 3. Status filter, kept in the URL | ![Search](poc/screens/04-tasks-search-report.png) 4. Search by title |
| ![Validation](poc/screens/05-create-validation.png) 5. Empty submit: field errors | ![Created](poc/screens/06-create-done.png) 6. Created, with a toast |
| ![Status changed](poc/screens/07-status-changed.png) 7. Status changed from the list | ![Detail](poc/screens/08-detail.png) 8. Task detail and edit form |
| ![Saved](poc/screens/09-edit-saved.png) 9. Saved | ![Confirm delete](poc/screens/10-delete-confirm.png) 10. Delete asks first |
| ![Deleted](poc/screens/11-deleted.png) 11. Deleted, back on the list | ![Dashboard after](poc/screens/12-dashboard-after-changes.png) 12. Dashboard numbers updated |
| ![Not found](poc/screens/13-task-not-found.png) 13. Unknown task id | |

## Mobile (390 px)

| Dashboard | Tasks | Detail |
|---|---|---|
| ![Mobile dashboard](poc/screens/mobile-dashboard.png) | ![Mobile tasks](poc/screens/mobile-tasks.png) | ![Mobile detail](poc/screens/mobile-detail.png) |

## Every state, from Storybook

Each component has a story per state; all 32 are in
[`poc/screens/storybook/`](poc/screens/storybook/). A few:

| Loading | Empty | Error with retry |
|---|---|---|
| ![Loading](poc/screens/storybook/tasks-tasklist--loading.png) | ![Empty](poc/screens/storybook/tasks-tasklist--empty.png) | ![Error](poc/screens/storybook/tasks-tasklist--error-state.png) |

| Server 422 next to the field | Task not found | Stats loading |
|---|---|---|
| ![422](poc/screens/storybook/tasks-taskform--server-field-error.png) | ![Not found](poc/screens/storybook/tasks-taskdetail--not-found.png) | ![Stats loading](poc/screens/storybook/dashboard-statscards--loading.png) |

## How these were made

- Each POC session: `claude -p "<prompt>" --model sonnet --effort medium --permission-mode
  acceptEdits` with the four skills in the project's `.claude/skills/`, and the prompt files in
  [`poc/steps/`](poc/steps/) as input.
- Screenshots and the recording: Chromium driven by Playwright against `VITE_API_MOCKING=true
  pnpm dev`, at 1280 × 860 and 390 × 844; Storybook stories from `pnpm build-storybook`.
- To check it yourself: `pnpm install && pnpm check` in `examples/task-tracker/`, and
  `bash claude-skills/.claude/skills/code-skeleton/scripts/verify.sh` from the repository root.
