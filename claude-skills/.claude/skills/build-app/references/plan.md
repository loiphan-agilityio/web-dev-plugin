# The plan: `docs/plan.md`

Write it in this shape. Every later step reads it: `develop-feature` gets one ticket at a time, the
mocks serve its data, and the final report copies its Assumptions. The example is the task tracker
the skills built as their proof of concept.

```markdown
# Task tracker

## Product
A personal task list: one person adds tasks, moves them through to-do, in progress and done,
and sees what is overdue or due soon.

## Data model
Task
- id: number
- title: string, required, trimmed, at most 120 characters
- description: string, optional ('' when empty), at most 1000 characters
- status: "todo" | "in_progress" | "done", new tasks start as "todo"
- priority: "low" | "medium" | "high", default "medium"
- dueDate: ISO date (YYYY-MM-DD) or null
- createdAt: ISO date-time, set by the server

## API
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /tasks | | Task[] | |
| POST | /tasks | { title, description, priority, dueDate } | 201 Task | 422 { message, errors: { field: message } } |
| GET | /tasks/:id | | Task | 404 |
| PATCH | /tasks/:id | any changed fields | Task | 404, 422 |
| DELETE | /tasks/:id | | 204 | 404 |
| GET | /tasks/stats | | { total, todo, inProgress, done, overdue, dueThisWeek } | |

## Features
### TASK-1 Tasks page: list, filter and create
As a user I want one place to see and add my tasks.
- New page at /tasks, linked from the header as "Tasks".
- Each row shows the title, a status badge, the priority and the due date ("No due date" when null).
  A task due before today that is not done is marked overdue.
- Filter by status and search by title, both kept in the URL (?status=done&q=report).
- A form creates a task; the list shows it, the form clears, a "Task created" toast appears.
  422 field errors appear next to the fields.
- Loading, empty ("No tasks yet"), no-match (with a way to clear the filters) and error-with-retry states.

### TASK-2 Task detail: edit, change status, delete
...

### TASK-3 Dashboard
...

## Mock data
8 tasks covering every status and priority: 2 overdue and not done, 2 due in the next 7 days,
1 with no due date, 1 with an empty description. Dates are relative to today, so overdue stays
overdue whenever the mocks run.

## Assumptions
- No sign-in: one user, all tasks are theirs.
- "Overdue" uses the browser's local date; a task due today is not overdue.
- Filtering and search happen in the browser: GET /tasks takes no query parameters.
- "Due soon" is today through today + 7, inclusive, not done.
```

## Rules for each part

- **Features** are tickets in build order: each one can be built and tested on top of the ones
  before it. The first is usually the list with its create form, because it defines the schema,
  the API layer and the mocks the others extend.
- **Acceptance criteria** name the visible result (a route, a label, a toast text, a state), so
  the tests can check them by role and text.
- **The API** includes the error statuses each endpoint returns, so `integrate-api` knows which
  `ApiError` cases to handle and test.
- **Assumptions** grow during the build: a gap found in step 3 is added here, not asked.
