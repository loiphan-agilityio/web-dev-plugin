TASK-2 is implemented, and `pnpm check` passes (lint, typecheck, 104 tests, build, Storybook build). I did not open the app in a browser, and I did not commit anything.

## Result
**Did:**
- **Detail page:** `/tasks/:id` loads the task with `GET /tasks/:id`.
  - It has four states: loading, a non-404 error with a retry, "Task not found" with a link back to the list, and the loaded task.
  - A 404, or an id in the URL that can't be a task id (`abc`, `0`, `-1`, `1.5`), shows "Task not found". An invalid id never makes a request.
- **Edit form:** all fields including status, saved with `PATCH /tasks/:id` carrying only the changed fields. Clearing the due date sends `null`.
  - It uses the same validation as creating, 422 field errors appear next to the fields, and a "Task updated" toast confirms the save.
  - If nothing changed, it shows a "No changes to save" toast instead of sending a request.
- **List rows:** the title links to the task page, and the status badge is now a select that sends `PATCH {status}`. The row and the status filter update after the list refetches.
- **Delete:** the Delete button opens a confirmation dialog. Confirming sends `DELETE`, goes back to `/tasks` and shows a "Task deleted" toast.
- **404 on PATCH or DELETE:** shows a "This task no longer exists" toast and refreshes the list. From the detail page it also goes back to `/tasks`.
- **Tests:**
  - New files: `task-edit-form.test.tsx`, `task-delete-button.test.tsx`, `task-detail.test.tsx` and `task-detail-page.test.tsx`.
  - Extended files: `task-list.test.tsx`, `tasks-page.test.tsx` and `schemas.test.ts`.
  - The 404 paths are covered for the row, the edit form, the delete button, the detail page, and one flow through the whole route tree.
  - Coverage for `src/features/tasks` is 97% of lines.
- **Stories:** a story file for each new component.
- **Supporting changes:**
  - Added `alert-dialog` with the shadcn CLI.
  - Added the three new endpoints to `api.ts`, `queries.ts` and the MSW handlers.
  - Added a `tasks/:id` route.
  - Added a `useTaskGone` hook for the shared 404 handling.
  - Added a `pattern` option to `renderWithProviders`, so a component that reads route params can be rendered alone.

**Saw:**
- Replacing the status badge with a select meant I had to update two existing assertions in `task-list.test.tsx` and `tasks-page.test.tsx` that looked for the badge text.
- Right after clicking a task link, the create form's "Title" field is still on screen until the lazy detail route loads. The page test waits for the "Edit task" form first.
- Bash heredocs and `mv` were blocked in this session, so I wrote files with the Write tool. The detail page is split in two: `task-detail.tsx` takes an `id` prop and `task-detail-page.tsx` reads the URL param, so the stories can render it.

**Not done:** none of the ticket's criteria were excluded. Two choices I made where the ticket was silent are listed below.

**Blocked by:** nothing.

**Next:** Please confirm these two choices:
- **Row 404:** when a 404 happens on a row's status change, I stay on `/tasks` (toast plus list refresh) instead of navigating to `/tasks`, because navigating would clear the user's filters.
- **Unchanged save:** a save with no changes shows a toast instead of sending an empty PATCH.

<!-- session: success, turns 88, cost $1.18, duration 7.3 min -->
