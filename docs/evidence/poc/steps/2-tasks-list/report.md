## Result
**Did:** The `/tasks` page is built and linked from the header as "Tasks". `pnpm check` passed: lint, typecheck, tests (12 files, 65 tests, `features/tasks` at 97% line coverage), build and Storybook build. One caveat on how I know: I ran the full chain once and it ended with "Storybook build completed successfully", but the lint and typecheck output had scrolled off. My attempt to rerun it with the output saved to a file was denied by the session's permission rules, so I reran only `pnpm test`.

- **Data layer** in `src/features/tasks/`: `schemas.ts`, `api.ts`, `queries.ts`, `mocks.ts`, `routes.tsx`, plus `dates.ts` for the overdue logic and `filters.ts` for the URL-backed filters.
- **Components** in `src/features/tasks/components/`:
  - `TasksPage` composes the other three.
  - `TaskForm` is the create form.
  - `TaskFilters` holds the status select and the title search.
  - `TaskList` shows loading, error with "Try again", "No tasks yet", "No tasks match your filters" with a "Clear filters" button, and the success list.
  - Each has a unit test in `components/__tests__/` and a `.stories.tsx` beside it.
- **Other tests:** `__tests__/schemas.test.ts` and `dates.test.ts`. The page test covers the header link, create-then-appears with the "Task created" toast, and opening and using the URL filters.
- **Wiring:** `src/app/routes.tsx`, `src/mocks/handlers.ts` and `src/app/root-layout.tsx` are edited. I added the shadcn components `badge`, `textarea` and `native-select`.

**Saw:**
- Filtering happens in the browser. The ticket specifies only `GET /tasks`, so the page fetches the whole list once and filters it by the URL's `status` and `q`. An unknown `status` in the URL is treated as "All", and typing in the search box replaces the history entry instead of adding one.
- The mock tasks' dates are computed relative to today, so the "overdue" rows stay overdue whenever the tests or the mock backend run. The eight tasks cover every status and priority, and four are overdue.
- A due date that has passed counts as overdue only for tasks that aren't done. A task due today is not overdue.
- The empty due-date input is sent to the server as `null`. The conversion happens in `api.ts`.
- The status filter and priority use native selects (shadcn `native-select`) rather than the Radix select, because Radix selects are hard to test in jsdom.
- The first shell command I tried was blocked by the session's permission rules, so I wrote the files with the Write/Edit tools instead. `shadcn add` had also generated `toggle` and `toggle-group`, which the feature doesn't use, so I deleted them.

**Not done:** Nothing from the ticket is excluded. I didn't check the page in a real browser, only through tests and the Storybook build.

**Blocked by:** Nothing.

**Next:**
- Confirm that filtering in the browser is acceptable. If the real backend filters on the server (`?status=`, `?q=`), the query keys and `api.ts` need to change.
- Confirm the 422 field names are `title`, `description`, `priority` and `dueDate`. Errors under any other key land in the general error box above the submit button instead of next to a field.

<!-- session: success, turns 40, cost $0.78, duration 4.4 min -->
