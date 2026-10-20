import { daysFromToday } from '@/features/tasks/dates';
import { taskFixtures } from '@/features/tasks/mocks';
import type { Task } from '@/features/tasks/schemas';

import { completionRate, selectDueSoon } from '../due-soon';

const task = (id: number, overrides: Partial<Task>): Task => ({
  id,
  title: `Task ${String(id)}`,
  description: '',
  status: 'todo',
  priority: 'low',
  dueDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('selectDueSoon', () => {
  it('keeps unfinished tasks due today through day 7, soonest first', () => {
    const tasks = [
      task(1, { dueDate: daysFromToday(7) }),
      task(2, { dueDate: daysFromToday(0) }),
      task(3, { dueDate: daysFromToday(3), status: 'in_progress' }),
    ];
    expect(selectDueSoon(tasks).map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('drops done, overdue, undated and later-than-a-week tasks', () => {
    const tasks = [
      task(1, { dueDate: daysFromToday(2), status: 'done' }),
      task(2, { dueDate: daysFromToday(-1) }),
      task(3, { dueDate: null }),
      task(4, { dueDate: daysFromToday(8) }),
    ];
    expect(selectDueSoon(tasks)).toEqual([]);
  });

  it('orders tasks due the same day by id', () => {
    const due = daysFromToday(1);
    const tasks = [task(5, { dueDate: due }), task(4, { dueDate: due })];
    expect(selectDueSoon(tasks).map((t) => t.id)).toEqual([4, 5]);
  });

  it('selects tasks 3 and 4 from the fixtures', () => {
    expect(selectDueSoon(taskFixtures).map((t) => t.id)).toEqual([3, 4]);
  });
});

describe('completionRate', () => {
  it('rounds done / total to a whole percentage', () => {
    expect(completionRate(1, 3)).toBe(33);
    expect(completionRate(2, 8)).toBe(25);
    expect(completionRate(4, 4)).toBe(100);
  });

  it('is 0 with no tasks', () => {
    expect(completionRate(0, 0)).toBe(0);
  });
});
