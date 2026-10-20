`/tasks` is built as specified and `pnpm check` passes. Lint, typecheck, build and the Storybook build are clean, and all 71 tests pass (about 96% line coverage). I didn't open the page in a browser, so the layout hasn't been checked by eye.

## Result
**Did:**
- **Feature code:** the new `src/features/tasks/` folder holds the schemas, API calls, queries, mocks, a lazy `/tasks` route, and the filter and overdue helpers.
- **Components:** `TasksPage`, `TaskForm`, `TaskFilters` and `TaskList`. Each has a unit test in `components/__tests__/` and a story beside it. The page has a `renderRoute` test and a story too, and there are separate schema and filter tests.
- **Wiring:** the route is registered in `src/app/routes.tsx`, the mock handlers in `src/mocks/handlers.ts`, and a "Tasks" link is in the header.
- **shadcn:** I added `badge`, `native-select` and `textarea` with the CLI. I didn't edit them.
- **Filtering:** the URL query `?status=…&q=…` drives the list.
  - The status select and the search box write to it with `replace`.
  - "Clear filters" removes it.
  - An unknown status value is treated as All.
  - Filtering happens in the browser, on the list from `GET /tasks`.
- **Form:**
  - **Title:** required, trimmed, at most 120 characters.
  - **Description:** optional, at most 1000 characters.
  - **Priority:** defaults to medium.
  - **Due date:** empty is sent as `null`.
  - **On success:** the list refetches, the form clears, and a "Task created" toast appears.
  - **On a 422:** field errors show next to their fields. Any other failure shows an alert above the button.
- **States:** loading, error with "Try again", "No tasks yet", and "No tasks match these filters." with "Clear filters".
- **Rows and mocks:**
  - **Row:** title, status badge, priority, due date or "No due date", and an "Overdue" badge when the due date is before today and the task isn't done.
  - **Mock backend:** eight tasks cover every status and priority. Three are overdue, and a fourth is past due but done. Their dates are relative to today, so the overdue ones stay overdue.

**Saw:**
- `shadcn add` generated files that import `cn` from `"cn"`; lint and the build accept it.
- A freshly created task is hidden if it doesn't match the active status filter. One page test covers this.

**Not done:** nothing from the ticket was excluded.

**Blocked by:** nothing.

**Next:** please confirm these choices, which the ticket left open:
- Does "today" for overdue mean the browser's local date? A task due today is not overdue. Does the backend agree?
- Is the title search a case-insensitive substring match, filtered in the browser? If the backend should filter, that needs a new contract.
- Due dates show as the raw `YYYY-MM-DD`, not a locale format.
- Priority is plain text ("Priority: High"), the status is a badge, and rows are in the order the API returns them.
- The filter labels read "Status" and "Search". Is that the wording you want?
- The 422 field keys are assumed to be the form's field names (`title`, `description`, `priority`, `dueDate`).