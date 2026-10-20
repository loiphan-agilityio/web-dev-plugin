Implement this ticket.

**TASK-3 — Dashboard**

As a user I want to see where my work stands when I open the app.

- The home page `/` becomes a dashboard, linked from the header as "Dashboard".
- Summary cards from `GET /tasks/stats`, which returns `{ total, todo, inProgress, done, overdue, dueThisWeek }` (all numbers). Show the counts and the completion rate (done / total) as a progress bar.
- A "Due soon" list: the tasks due in the next 7 days that are not done, soonest first, each linking to its detail page. Take them from `GET /tasks`.
- Creating, updating or deleting a task refreshes the dashboard numbers.
- Loading and error states (with retry) for the cards and the list; an empty "Nothing due this week" state for the list.
- Tests for all of the above.

Write your final report in English.
