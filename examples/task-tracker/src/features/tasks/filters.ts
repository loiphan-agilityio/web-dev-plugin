import { Schema } from 'effect';

import { type Task, type TaskPriority, TaskStatus } from './schemas';

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

export interface TaskFilters {
  /** `undefined` means "All". */
  readonly status: TaskStatus | undefined;
  readonly q: string;
}

const isTaskStatus = Schema.is(TaskStatus);

/** Reads the filters from the URL query; an unknown `status` value counts as "All". */
export const readFilters = (params: URLSearchParams): TaskFilters => {
  const status = params.get('status');
  return {
    status: isTaskStatus(status) ? status : undefined,
    q: params.get('q') ?? '',
  };
};

export const hasFilters = ({ status, q }: TaskFilters) => status !== undefined || q.trim() !== '';

/** Status is an exact match; the search is a case-insensitive substring of the title. */
export const filterTasks = (tasks: readonly Task[], { status, q }: TaskFilters) => {
  const needle = q.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (status === undefined || task.status === status) && task.title.toLowerCase().includes(needle),
  );
};

/** Today as `YYYY-MM-DD` in the user's time zone, the same shape as `Task.dueDate`. */
export const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
};

/** `YYYY-MM-DD` as a short label such as `Oct 22`. */
export const formatDueDate = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/** Due before today and not done. A task due today is not overdue. */
export const isOverdue = ({ dueDate, status }: Pick<Task, 'dueDate' | 'status'>, today: string) =>
  status !== 'done' && dueDate !== null && dueDate < today;
