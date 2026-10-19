import { Schema } from 'effect';

/** A todo as the API returns it. */
export const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
});
export type Todo = typeof Todo.Type;

export const TodoList = Schema.Array(Todo);

/**
 * What the create form collects and the API accepts. `Schema.Trim` decodes "  milk " to
 * "milk", so the form's input type (`NewTodoInput`, the schema's Encoded side) and its
 * submitted type (`NewTodo`, the Type side) differ — useForm takes both.
 */
export const NewTodo = Schema.Struct({
  title: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Title is required' }),
      Schema.isMaxLength(100, { message: 'Keep the title under 100 characters' }),
    ),
  ),
});
export type NewTodo = typeof NewTodo.Type;
export type NewTodoInput = typeof NewTodo.Encoded;
