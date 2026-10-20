Implement this ticket.

**TASK-2 — Task detail: edit, change status, delete**

As a user I want to open a task, change it, and remove it when it is no longer needed.

- Clicking a task in the list opens `/tasks/:id`, loaded with `GET /tasks/:id`. An unknown id (404) shows a "Task not found" state with a link back to the list.
- The detail page has an edit form with every field including status, saved with `PATCH /tasks/:id` (send only the changed fields; the server returns the updated task). Same validation as creating; 422 field errors appear next to the fields. A "Task updated" toast confirms the save.
- In the list, each row lets the user change the status directly (`PATCH /tasks/:id` with `{ status }`); the row and the filters reflect the change without a full reload.
- The detail page has a Delete button that asks for confirmation first. `DELETE /tasks/:id` returns 204; then go back to `/tasks` and show a "Task deleted" toast.
- If a PATCH or DELETE returns 404 (someone else deleted the task), show a "This task no longer exists" toast, refresh the list and go back to `/tasks`.
- Tests for all of the above, including the 404 paths.

Write your final report in English.
