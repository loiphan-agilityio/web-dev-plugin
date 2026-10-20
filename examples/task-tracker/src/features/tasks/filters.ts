import { useSearchParams } from 'react-router';

import { type StatusFilter, statusFilters } from './schemas';

const isStatusFilter = (value: string | null): value is StatusFilter =>
  statusFilters.some((filter) => filter === value);

/**
 * The list filters, kept in the URL (`?status=in_progress&q=report`) so a filtered view can be
 * shared and survives a reload. An unknown `status` falls back to "all".
 */
export const useTaskFilters = () => {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status');
  const status: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : 'all';
  const q = params.get('q') ?? '';

  const set = (key: 'status' | 'q', value: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === '' || (key === 'status' && value === 'all')) next.delete(key);
        else next.set(key, value);
        return next;
      },
      // Typing in the search box must not add a history entry per keystroke.
      { replace: true },
    );
  };

  return {
    status,
    q,
    isFiltered: status !== 'all' || q.trim() !== '',
    setStatus: (value: StatusFilter) => {
      set('status', value);
    },
    setQ: (value: string) => {
      set('q', value);
    },
    clear: () => {
      setParams({}, { replace: true });
    },
  };
};
