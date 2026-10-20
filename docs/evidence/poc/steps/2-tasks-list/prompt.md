Implement this ticket.

**TASK-1 — Tasks page: list, filter and create**

As a user I want one place to see and add my tasks.

- New page at `/tasks`, linked from the header as "Tasks".
- List tasks from `GET /tasks`. A task has `id` (number), `title` (string), `description` (string), `status` (`"todo"`, `"in_progress"` or `"done"`), `priority` (`"low"`, `"medium"` or `"high"`), `dueDate` (ISO date string `YYYY-MM-DD`, or `null`) and `createdAt` (ISO date-time string).
- Each row shows the title, a status badge, the priority and the due date ("No due date" when `null`). A task whose due date is before today and is not done is marked as overdue.
- Filter by status (All, To do, In progress, Done) and search by title. Both filters live in the URL query (`?status=in_progress&q=report`) so a filtered view can be shared and survives a reload.
- A form on the same page creates a task with `POST /tasks` (`{ title, description, priority, dueDate }`, the server returns the created task with status `"todo"`). Title is required, at most 120 characters, leading/trailing spaces ignored. Description is optional, at most 1000 characters. Priority defaults to medium. Due date is optional.
- After creating a task the list shows it, the form is cleared and a "Task created" toast appears.
- If the server rejects the task (422 with field errors), show the messages next to the fields.
- Show a loading state, an empty state ("No tasks yet"), a different empty state when the filters match nothing (with a way to clear the filters), and an error state with a retry.
- The mock backend starts with about eight realistic tasks covering every status and priority, some overdue.
- Tests for all of the above.

Write your final report in English.
