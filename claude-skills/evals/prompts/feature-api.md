Implement this ticket.

**TODOS-7 — Edit and delete todos**

As a user I want to fix a todo's title or remove a todo I no longer need.

- Each todo in the list has an Edit button. It turns the row into a small form with the current title; Save sends `PATCH /todos/:id` with `{ title }` and the server returns the updated todo. The title follows the same rules as when creating one (required, at most 100 characters, surrounding spaces ignored). If the server rejects the title (422 with field errors), show its message under the field.
- Each todo has a Delete button. `DELETE /todos/:id` answers 204 and the todo disappears from the list.
- If the server answers 404 to either (the todo was already deleted elsewhere), show a toast "This todo no longer exists" and refresh the list.
- Tests for all of the above.
