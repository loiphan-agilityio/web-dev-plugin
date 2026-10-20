import { addDays, daysBetween, today, toIsoDate } from '../dates';

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds days across month and year boundaries, in both directions', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-15')).toBe(14);
    expect(daysBetween('2026-10-15', '2026-10-01')).toBe(-14);
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(0);
  });

  it('returns today as an ISO date', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
