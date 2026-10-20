import type { Task } from '@/features/tasks/schemas';

import { addDays, completionRate, dueSoon } from '../due-soon';

const today = '2026-10-21';

const task = (id: number, dueDate: string | null, status: Task['status'] = 'todo'): Task => ({
  id,
  title: `Task ${String(id)}`,
  description: '',
  status,
  priority: 'medium',
  dueDate,
  createdAt: '2026-01-05T09:00:00.000Z',
});

describe('addDays', () => {
  it('adds days across a month and a year boundary', () => {
    expect(addDays('2026-10-21', 7)).toBe('2026-10-28');
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04');
    expect(addDays('2026-12-30', 7)).toBe('2027-01-06');
  });
});

describe('dueSoon', () => {
  it('keeps today and today + 7 days, drops yesterday and today + 8 days', () => {
    const tasks = [
      task(1, addDays(today, -1)),
      task(2, today),
      task(3, addDays(today, 7)),
      task(4, addDays(today, 8)),
    ];
    expect(dueSoon(tasks, today).map(({ id }) => id)).toEqual([2, 3]);
  });

  it('drops done tasks and tasks without a due date', () => {
    const tasks = [task(1, today, 'done'), task(2, null), task(3, today, 'in_progress')];
    expect(dueSoon(tasks, today).map(({ id }) => id)).toEqual([3]);
  });

  it('sorts soonest first', () => {
    const tasks = [task(1, addDays(today, 5)), task(2, addDays(today, 1)), task(3, today)];
    expect(dueSoon(tasks, today).map(({ id }) => id)).toEqual([3, 2, 1]);
  });

  it('does not reorder the list it is given', () => {
    const tasks = [task(1, addDays(today, 5)), task(2, today)];
    dueSoon(tasks, today);
    expect(tasks.map(({ id }) => id)).toEqual([1, 2]);
  });
});

describe('completionRate', () => {
  it('is done / total as a rounded percentage', () => {
    expect(completionRate({ done: 2, total: 8 })).toBe(25);
    expect(completionRate({ done: 1, total: 3 })).toBe(33);
    expect(completionRate({ done: 3, total: 3 })).toBe(100);
  });

  it('is 0 when there are no tasks', () => {
    expect(completionRate({ done: 0, total: 0 })).toBe(0);
  });
});
