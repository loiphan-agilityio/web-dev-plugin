import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';

import { todoListQueryOptions } from '../queries';

/** Loading, error, empty and success are four different screens — never one ternary. */
export function TodoList() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(todoListQueryOptions());

  // isPending is true only before the first result, so a background refetch keeps the list.
  if (isPending) {
    return (
      <div role="status" aria-label="Loading todos" className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load todos</AlertTitle>
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
    return <p className="text-muted-foreground">No todos yet. Add the first one above.</p>;
  }

  return (
    <ul aria-label="Todos" className="divide-y rounded-lg border">
      {data.map((todo) => (
        <li key={todo.id} className="flex items-center justify-between px-4 py-3">
          <span className={todo.completed ? 'text-muted-foreground line-through' : undefined}>
            {todo.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
