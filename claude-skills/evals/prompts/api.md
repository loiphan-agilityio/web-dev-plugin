In the todos feature, add two endpoints:

- Toggle a todo's completed state: `PATCH /todos/:id` with body `{ "completed": boolean }`, returns the updated todo. Add a checkbox next to each todo that calls it.
- Delete a todo: `DELETE /todos/:id`, returns 204. Add a delete button next to each todo.

If the API answers 404 for either one (the todo was already deleted elsewhere), show a toast saying the todo no longer exists and refresh the list. Keep the list correct after both actions, and add tests, including the 404 case.
