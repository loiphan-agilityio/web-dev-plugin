const pad = (value: number) => String(value).padStart(2, '0');

/** A local calendar date as `YYYY-MM-DD`. */
export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Today in the browser's local time zone. */
export const today = () => toIsoDate(new Date());

/** `isoDate` moved by `days` (negative for the past), still `YYYY-MM-DD`. */
export const addDays = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return toIsoDate(new Date(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days));
};

/** Whole days from `from` to `to` (positive when `to` is later). */
export const daysBetween = (from: string, to: string) => {
  const toUtc = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
};
