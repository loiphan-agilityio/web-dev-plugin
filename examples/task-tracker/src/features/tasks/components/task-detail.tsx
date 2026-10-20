import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';

import { taskDetailQueryOptions } from '../queries';
import { TaskDeleteButton } from './task-delete-button';
import { TaskEditForm } from './task-edit-form';

/** An id that cannot exist and one the server does not know look the same to the user. */
export function TaskNotFound() {
  return (
    <section className="space-y-2">
      <h1 className="font-heading text-2xl font-semibold">Task not found</h1>
      <p className="text-muted-foreground">It may have been deleted.</p>
      <Button asChild variant="outline">
        <Link to="/tasks">Back to tasks</Link>
      </Button>
    </section>
  );
}

/** Loading, error, not found and success are different screens (there is no empty state). */
export function TaskDetail({ id }: { id: number }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery(
    taskDetailQueryOptions(id),
  );

  if (isPending) {
    return (
      <div role="status" aria-label="Loading task" className="space-y-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError) {
    if (error._tag === 'NotFoundError') return <TaskNotFound />;
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the task</AlertTitle>
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

  return (
    <section className="space-y-6">
      <Link to="/tasks" className="text-sm text-muted-foreground hover:underline">
        ← Back to tasks
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Edit task</h1>
        <TaskDeleteButton task={data} />
      </div>
      <TaskEditForm key={data.id} task={data} />
    </section>
  );
}
