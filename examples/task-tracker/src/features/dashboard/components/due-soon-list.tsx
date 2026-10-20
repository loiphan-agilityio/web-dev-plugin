import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDueDate, todayIso } from '@/features/tasks/filters';
import { taskListQueryOptions } from '@/features/tasks/queries';
import { StatusBadge } from '@/features/tasks/components/status-badge';
import { toUserMessage } from '@/lib/api/errors';

import { dueSoon } from '../due-soon';

const DueSoonCard = ({ children }: { readonly children: ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle>
        <h2 className="text-lg font-semibold">Due soon</h2>
      </CardTitle>
      <CardAction className="text-sm text-muted-foreground">Next 7 days</CardAction>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

/** Loading, error, empty ("Nothing due this week") and success are different screens. */
export const DueSoonList = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(taskListQueryOptions());

  if (isPending) {
    return (
      <DueSoonCard>
        <div role="status" aria-label="Loading due soon" className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </DueSoonCard>
    );
  }

  if (isError) {
    return (
      <DueSoonCard>
        <Alert variant="destructive">
          <AlertTitle>Could not load the due soon list</AlertTitle>
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
      </DueSoonCard>
    );
  }

  const tasks = dueSoon(data, todayIso());

  if (tasks.length === 0) {
    return (
      <DueSoonCard>
        <p className="text-muted-foreground">
          Nothing due this week.{' '}
          <Link to="/tasks" className="underline hover:text-foreground">
            Go to the tasks
          </Link>{' '}
          to plan the next one.
        </p>
      </DueSoonCard>
    );
  }

  return (
    <DueSoonCard>
      <ul aria-label="Due soon" className="divide-y border-t">
        {tasks.map(({ id, title, status, dueDate }) => (
          <li key={id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <Link to={`/tasks/${String(id)}`} className="font-semibold hover:underline">
                {title}
              </Link>
              {dueDate !== null && (
                <p className="text-sm text-muted-foreground">
                  Due <time dateTime={dueDate}>{formatDueDate(dueDate)}</time>
                </p>
              )}
            </div>
            <StatusBadge status={status} />
          </li>
        ))}
      </ul>
    </DueSoonCard>
  );
};
