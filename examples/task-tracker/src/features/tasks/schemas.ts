import { Schema, SchemaTransformation } from 'effect';

export const TaskStatus = Schema.Literals(['todo', 'in_progress', 'done']);
export type TaskStatus = typeof TaskStatus.Type;

export const TaskPriority = Schema.Literals(['low', 'medium', 'high']);
export type TaskPriority = typeof TaskPriority.Type;

/** A task as the API returns it. `dueDate` is `YYYY-MM-DD` or `null`; `createdAt` is ISO date-time. */
export const Task = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  description: Schema.String,
  status: TaskStatus,
  priority: TaskPriority,
  dueDate: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});
export type Task = typeof Task.Type;

export const TaskList = Schema.Array(Task);

/** The date input holds '' when empty; the API wants `null`. */
const DueDate = Schema.String.pipe(
  Schema.decodeTo(
    Schema.NullOr(Schema.String),
    SchemaTransformation.transform({
      decode: (value) => (value === '' ? null : value),
      encode: (value) => value ?? '',
    }),
  ),
);

/** The create request. `Type` is the body the API gets, `Encoded` is what the form holds. */
export const NewTask = Schema.Struct({
  title: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Title is required' }),
      Schema.isMaxLength(120, { message: 'Keep the title under 120 characters' }),
    ),
  ),
  description: Schema.String.pipe(
    Schema.check(
      Schema.isMaxLength(1000, { message: 'Keep the description under 1000 characters' }),
    ),
  ),
  priority: TaskPriority,
  dueDate: DueDate,
});
export type NewTask = typeof NewTask.Type;
export type NewTaskInput = typeof NewTask.Encoded;

/** The edit form: every field of a task the user can change, status included. */
export const TaskEdit = Schema.Struct({ ...NewTask.fields, status: TaskStatus });
export type TaskEdit = typeof TaskEdit.Type;
export type TaskEditInput = typeof TaskEdit.Encoded;

/** The PATCH body: only the fields that changed. */
export type TaskPatch = Partial<TaskEdit>;

/** `GET /tasks/stats`: counts the server computes over all tasks. */
export const TaskStats = Schema.Struct({
  total: Schema.Number,
  todo: Schema.Number,
  inProgress: Schema.Number,
  done: Schema.Number,
  overdue: Schema.Number,
  dueThisWeek: Schema.Number,
});
export type TaskStats = typeof TaskStats.Type;
