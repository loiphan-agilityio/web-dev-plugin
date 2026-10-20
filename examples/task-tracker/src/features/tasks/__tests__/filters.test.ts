import { filterTasks, hasFilters, isOverdue, readFilters, todayIso } from '../filters';
import { dateFromToday, taskFixtures } from '../mocks';

describe('readFilters', () => {
  it('reads status and q from the query', () => {
    expect(readFilters(new URLSearchParams('status=in_progress&q=report'))).toEqual({
      status: 'in_progress',
      q: 'report',
    });
  });

  it('treats a missing or unknown status as All', () => {
    expect(readFilters(new URLSearchParams('')).status).toBeUndefined();
    expect(readFilters(new URLSearchParams('status=blocked')).status).toBeUndefined();
  });
});

describe('hasFilters', () => {
  it('is false for All and a blank search', () => {
    expect(hasFilters({ status: undefined, q: '  ' })).toBe(false);
    expect(hasFilters({ status: 'done', q: '' })).toBe(true);
    expect(hasFilters({ status: undefined, q: 'x' })).toBe(true);
  });
});

describe('filterTasks', () => {
  it('filters by status', () => {
    const result = filterTasks(taskFixtures, { status: 'done', q: '' });
    expect(result.map(({ id }) => id)).toEqual([5, 6]);
  });

  it('searches the title, ignoring case and surrounding spaces', () => {
    const result = filterTasks(taskFixtures, { status: undefined, q: '  REPORT ' });
    expect(result.map(({ id }) => id)).toEqual([1]);
  });

  it('combines both filters', () => {
    expect(filterTasks(taskFixtures, { status: 'done', q: 'report' })).toEqual([]);
  });
});

describe('isOverdue', () => {
  const today = todayIso();

  it('is true for a past due date that is not done', () => {
    expect(isOverdue({ dueDate: dateFromToday(-1), status: 'todo' }, today)).toBe(true);
    expect(isOverdue({ dueDate: dateFromToday(-1), status: 'in_progress' }, today)).toBe(true);
  });

  it('is false when due today, in the future, without a date, or done', () => {
    expect(isOverdue({ dueDate: today, status: 'todo' }, today)).toBe(false);
    expect(isOverdue({ dueDate: dateFromToday(1), status: 'todo' }, today)).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'todo' }, today)).toBe(false);
    expect(isOverdue({ dueDate: dateFromToday(-1), status: 'done' }, today)).toBe(false);
  });
});
