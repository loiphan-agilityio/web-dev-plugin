/** Today as `YYYY-MM-DD` in the user's time zone (due dates are calendar dates, not instants). */
export const todayIso = (now = new Date()): string => {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
};

/** A `YYYY-MM-DD` calendar date as "Oct 22", without going through a time zone. */
export const formatDueDate = (dueDate: string): string => {
  const [year = 0, month = 1, day = 1] = dueDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/** `YYYY-MM-DD` strings sort lexicographically, so a string compare is a date compare. */
export const isOverdue = (
  task: { dueDate: string | null; status: string },
  today = todayIso(),
): boolean => task.dueDate !== null && task.status !== 'done' && task.dueDate < today;

/** The date `days` from today as `YYYY-MM-DD` (negative = past). */
export const daysFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayIso(date);
};
