## Result
**Did:** The home page `/` is now a dashboard, linked from the header as "Dashboard".
- **Stats cards:** `StatsCards` reads `GET /tasks/stats` and shows total, to do, in progress, done, overdue and due this week. It shows the completion rate (done / total) as a progress bar with a percentage.
- **Due soon list:** `DueSoonList` takes tasks from `GET /tasks`: not done, due from today through day 7, soonest first, ties by id. Each links to `/tasks/:id`.
- **States:** Both widgets have loading, error (with "Try again") and success states. The list's empty state reads "Nothing due this week", with a link to plan the next task. The cards show zeros and 0% when there are no tasks, which I took as the cards' empty case.
- **Refresh:** Creating, updating and deleting a task now also invalidate the stats key (in `useCreateTask`, `useUpdateTask`, `useDeleteTask`). The due list refreshes through the existing list invalidation.
- **Tasks feature changes:** I added `TaskStats`, `getTaskStats`, `taskKeys.stats()` and `taskStatsQueryOptions` to the tasks feature. The mocks gained a `/tasks/stats` handler, `computeStats`, and `statsPending` / `statsError`.
- **New files:** The dashboard lives in `src/features/dashboard/`:
  - `routes.tsx`, with a lazy index route.
  - `due-soon.ts`, holding `selectDueSoon` and `completionRate`.
  - Components `dashboard-page`, `stats-cards` and `due-soon-list`, each with a story file and a unit test file in `__tests__/`.
- **Other changes:** I added the shadcn `progress` component with the CLI. I replaced `src/app/home-page.tsx` and its test. The not-found test moved to `src/app/__tests__/routes.test.tsx`.
- **Tests:** The new tests cover:
  - the stats and due list helpers;
  - the `TaskStats` schema;
  - each component's four states;
  - the page, including header navigation, opening a due task, and the dashboard numbers refreshing after create, update and delete.
- **Gates:** Lint, typecheck, test and build all passed, and the Storybook build completed. In the last full test run, 127 tests ran and the two that failed were fixed. Line coverage in the final run was 97.7%. I could not confirm a final exit code for the full `pnpm check`: the follow-up re-run was blocked by the sandbox. The last full output ended with "Storybook build completed successfully", and a later `pnpm test` ran clean.

**Saw:**
- **Existing code:** The existing `taskListQueryOptions`, `isOverdue` and the date helpers were reused. The generated `progress.tsx` does not pass `value` to Radix, so I set `aria-valuenow` explicitly on the bar rather than edit the generated file.
- **Mock route order:** The `/tasks/stats` mock handler is registered before `/tasks/:id`. Otherwise "stats" would match as an id.
- **Fixture comment:** A comment in `mocks.ts` says four fixtures are overdue, but only three are, because the other two past-due fixtures are done.
- **Home route is lazy:** The header is no longer on screen immediately, so I changed one existing test in `tasks-page.test.tsx` to wait for the "Tasks" link.

**Not done:** Nothing excluded. The backend's own `/tasks/stats` logic is not tested here (the mock computes it).

**Blocked by:** Two assumptions I made, since the ticket doesn't say:
- Whether "due in the next 7 days" includes overdue tasks. I assumed not, and the Overdue card covers them.
- Whether it is today plus 7 days, inclusive. I assumed so.

**Next:** Confirm those two assumptions. The client's due-soon window should match how the backend computes `dueThisWeek`. If the real API counts them differently, the card and the list could disagree.

<!-- session: success, turns 73, cost $0.82, duration 5.9 min -->
