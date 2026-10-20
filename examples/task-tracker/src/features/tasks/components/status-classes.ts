import type { TaskStatus } from '../schemas';

/** Pill colors per status, shared by the status badge and the status select in a task row. */
export const statusClasses: Record<TaskStatus, string> = {
  todo: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-warning text-warning-foreground',
  done: 'bg-success text-success-foreground',
};
