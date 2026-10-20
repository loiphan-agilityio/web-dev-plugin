import { SearchIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { readFilters, statusLabels } from '../filters';
import { TaskStatus } from '../schemas';

const statusOptions = [
  { value: '', label: 'All' },
  ...TaskStatus.literals.map((value) => ({ value, label: statusLabels[value] })),
];

/** Status and title search, kept in the URL query so a filtered view can be shared. */
export const TaskFilters = () => {
  const [params, setParams] = useSearchParams();
  const { status, q } = readFilters(params);

  // Writes one key and keeps the rest; an empty value drops the key. `replace` keeps the
  // history clean while typing.
  const setParam = (key: 'status' | 'q', value: string) => {
    const next = new URLSearchParams(params);
    if (value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  return (
    <search className="flex flex-wrap items-center justify-between gap-4">
      <div
        role="group"
        aria-label="Status"
        className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
      >
        {statusOptions.map(({ value, label }) => {
          const selected = (status ?? '') === value;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                selected
                  ? 'bg-card font-medium text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setParam('status', value);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="relative w-full sm:w-72">
        <Label htmlFor="task-search" className="sr-only">
          Search
        </Label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="task-search"
          type="search"
          className="h-10 bg-card pl-9"
          placeholder="Search tasks"
          value={q}
          onChange={(event) => {
            setParam('q', event.target.value);
          }}
        />
      </div>
    </search>
  );
};
