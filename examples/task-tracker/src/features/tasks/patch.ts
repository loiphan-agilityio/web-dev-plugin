import type { Task, TaskEdit, TaskEditInput, TaskPatch } from './schemas';

/** The edit form's field values for a task: the date input holds '' when there is none. */
export const toEditInput = ({
  title,
  description,
  priority,
  status,
  dueDate,
}: Task): TaskEditInput => ({
  title,
  description,
  priority,
  status,
  dueDate: dueDate ?? '',
});

/** The fields of `values` that differ from `task`, so a PATCH sends only what changed. */
export const changedFields = (task: Task, values: TaskEdit): TaskPatch => ({
  ...(values.title !== task.title && { title: values.title }),
  ...(values.description !== task.description && { description: values.description }),
  ...(values.priority !== task.priority && { priority: values.priority }),
  ...(values.status !== task.status && { status: values.status }),
  ...(values.dueDate !== task.dueDate && { dueDate: values.dueDate }),
});
