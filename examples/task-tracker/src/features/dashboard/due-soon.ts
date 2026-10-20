import type { Task, TaskStats } from '@/features/tasks/schemas';

/** `YYYY-MM-DD` for `iso` plus `days`, in local time like `todayIso`. */
export const addDays = (iso: string, days: number) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${mm}-${dd}`;
};

/**
 * Tasks not done and due from today through today + 7 days (both ends included), soonest first.
 * Overdue tasks are not "due soon": they are counted in the Overdue card.
 */
export const dueSoon = (tasks: readonly Task[], today: string) => {
  const last = addDays(today, 7);
  return tasks
    .filter(
      ({ status, dueDate }) =>
        status !== 'done' && dueDate !== null && dueDate >= today && dueDate <= last,
    )
    .toSorted((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.id - b.id);
};

/** Share of tasks that are done, as a whole percentage; 0 when there are no tasks. */
export const completionRate = ({ done, total }: Pick<TaskStats, 'done' | 'total'>) =>
  total === 0 ? 0 : Math.round((done / total) * 100);
