import { SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { useTaskFilters } from '../filters';
import { statusFilters, statusLabels } from '../schemas';

const optionLabel = (filter: (typeof statusFilters)[number]) =>
  filter === 'all' ? 'All' : statusLabels[filter];

/** Status and title-search filters; both live in the URL query. */
export function TaskFilters() {
  const { status, q, setStatus, setQ } = useTaskFilters();

  return (
    <form
      role="search"
      aria-label="Filter tasks"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div
        role="group"
        aria-label="Status"
        className="flex w-fit gap-1 rounded-xl bg-muted p-1"
      >
        {statusFilters.map((filter) => (
          <Button
            key={filter}
            type="button"
            variant="ghost"
            aria-pressed={status === filter}
            className={cn(
              'h-8 rounded-lg px-3 text-muted-foreground',
              status === filter && 'bg-card text-foreground shadow-xs',
            )}
            onClick={() => {
              setStatus(filter);
            }}
          >
            {optionLabel(filter)}
          </Button>
        ))}
      </div>
      <div className="relative sm:w-70">
        <Label htmlFor="task-search" className="sr-only">
          Search by title
        </Label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="task-search"
          type="search"
          placeholder="Search tasks"
          className="h-10 bg-card pl-9"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
          }}
        />
      </div>
    </form>
  );
}
