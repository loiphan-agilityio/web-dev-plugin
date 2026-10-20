import { formatDueDate, isOverdue, todayIso } from '../dates';

describe('formatDueDate', () => {
  it('shows the month and day of a calendar date', () => {
    expect(formatDueDate('2026-10-22')).toBe('Oct 22');
    expect(formatDueDate('2026-01-05')).toBe('Jan 5');
  });
});

describe('todayIso', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('isOverdue', () => {
  const today = '2026-10-20';

  it('is overdue when the due date is before today and the task is not done', () => {
    expect(isOverdue({ dueDate: '2026-10-19', status: 'todo' }, today)).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-19', status: 'in_progress' }, today)).toBe(true);
  });

  it('is not overdue on the due date itself or later', () => {
    expect(isOverdue({ dueDate: today, status: 'todo' }, today)).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-21', status: 'todo' }, today)).toBe(false);
  });

  it('is never overdue when done or without a due date', () => {
    expect(isOverdue({ dueDate: '2026-01-01', status: 'done' }, today)).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'todo' }, today)).toBe(false);
  });
});
