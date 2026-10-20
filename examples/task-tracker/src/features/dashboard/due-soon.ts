import { daysFromToday, todayIso } from '@/features/tasks/dates';
import type { Task } from '@/features/tasks/schemas';

/** Unfinished tasks due from today through `days` days ahead, soonest first (overdue ones are not "soon"). */
export const selectDueSoon = (tasks: readonly Task[], days = 7, today = todayIso()): Task[] => {
  const end = daysFromToday(days);
  return tasks
    .filter(
      (task) =>
        task.status !== 'done' &&
        task.dueDate !== null &&
        task.dueDate >= today &&
        task.dueDate <= end,
    )
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.id - b.id);
};

/** Done / total as a whole percentage; 0 when there are no tasks. */
export const completionRate = (done: number, total: number): number =>
  total === 0 ? 0 : Math.round((done / total) * 100);
