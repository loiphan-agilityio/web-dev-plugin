import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';

import { taskDetailQueryOptions } from '../queries';
import { DeleteTaskButton } from './delete-task-button';
import { TaskEditForm } from './task-edit-form';

const BackLink = () => (
  <Link to="/tasks" className="text-sm text-muted-foreground hover:text-foreground">
    ← Back to tasks
  </Link>
);

/** Loading, error, not found and success are different screens. */
export const TaskDetailPage = () => {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    ...taskDetailQueryOptions(id),
    // An id that is not a number can never exist: do not ask the server.
    enabled: Number.isInteger(id),
  });

  if (Number.isInteger(id) && isPending) {
    return (
      <div role="status" aria-label="Loading task" className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError && error._tag !== 'NotFoundError') {
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

  // No data now means a 404, or an id that is not a number.
  if (data === undefined) {
    return (
      <section className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">Task not found</h1>
        <p className="text-muted-foreground">It may have been deleted.</p>
        <BackLink />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <BackLink />
      <h1 className="font-heading text-2xl font-semibold">{data.title}</h1>
      {/* Keyed by id so the form starts from the right task. */}
      <TaskEditForm key={data.id} task={data} />
      <DeleteTaskButton task={data} />
    </section>
  );
};
