import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';

import { filterTasks, hasFilters, readFilters, todayIso } from '../filters';
import { taskListQueryOptions } from '../queries';
import { TaskRow } from './task-row';

/** Loading, error, empty (no tasks / no match) and success are different screens. */
export const TaskList = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(taskListQueryOptions());
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);

  // isPending is true only before the first result, so a background refetch keeps the list.
  if (isPending) {
    return (
      <div role="status" aria-label="Loading tasks" className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load tasks</AlertTitle>
        <AlertDescription>
          <p>{toUserMessage(error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isRefetching}
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground">No tasks yet. Add the first one above.</p>;
  }

  const tasks = filterTasks(data, filters);

  if (tasks.length === 0 && hasFilters(filters)) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">No tasks match these filters.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setParams(new URLSearchParams(), { replace: true });
          }}
        >
          Clear filters
        </Button>
      </div>
    );
  }

  const today = todayIso();

  return (
    <ul aria-label="Tasks" className="divide-y rounded-xl border bg-card">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} today={today} />
      ))}
    </ul>
  );
};
