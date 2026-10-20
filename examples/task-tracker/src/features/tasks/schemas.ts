import { Schema } from 'effect';

export const TaskStatus = Schema.Literals(['todo', 'in_progress', 'done']);
export type TaskStatus = typeof TaskStatus.Type;

export const TaskPriority = Schema.Literals(['low', 'medium', 'high']);
export type TaskPriority = typeof TaskPriority.Type;

/** A task as the API returns it. `dueDate` is `YYYY-MM-DD`, `createdAt` an ISO date-time. */
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

/** `GET /tasks/stats`: counts per status, plus the unfinished tasks overdue / due within 7 days. */
export const TaskStats = Schema.Struct({
  total: Schema.Number,
  todo: Schema.Number,
  inProgress: Schema.Number,
  done: Schema.Number,
  overdue: Schema.Number,
  dueThisWeek: Schema.Number,
});
export type TaskStats = typeof TaskStats.Type;

/**
 * What the create form collects. `Schema.Trim` decodes "  report " to "report", so the form's
 * input type (`NewTaskInput`) and its submitted type (`NewTask`) differ — useForm takes both.
 * An empty `dueDate` means "no due date"; api.ts turns it into `null`.
 */
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
  dueDate: Schema.String,
});
export type NewTask = typeof NewTask.Type;
export type NewTaskInput = typeof NewTask.Encoded;

/** The edit form: the create fields plus the status. Same validation as creating. */
export const EditTask = Schema.Struct({ ...NewTask.fields, status: TaskStatus });
export type EditTask = typeof EditTask.Type;
export type EditTaskInput = typeof EditTask.Encoded;

/** The body of `PATCH /tasks/:id`: only the fields that changed. `dueDate: null` clears it. */
export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt'>>;

/** What the edit form shows for a task. */
export const toEditInput = (task: Task): EditTaskInput => ({
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate ?? '',
});

/** The fields of `values` that differ from `task`; empty when nothing changed. */
export const toTaskPatch = (task: Task, values: EditTask): TaskPatch => {
  const dueDate = values.dueDate || null;
  return {
    ...(values.title !== task.title && { title: values.title }),
    ...(values.description !== task.description && { description: values.description }),
    ...(values.status !== task.status && { status: values.status }),
    ...(values.priority !== task.priority && { priority: values.priority }),
    ...(dueDate !== task.dueDate && { dueDate }),
  };
};

export const statusFilters = ['all', 'todo', 'in_progress', 'done'] as const;
export type StatusFilter = (typeof statusFilters)[number];

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
