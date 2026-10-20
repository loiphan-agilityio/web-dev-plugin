import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';
import { formatDueDate } from '@/features/tasks/dates';
import { taskListQueryOptions } from '@/features/tasks/queries';
import { TaskStatusBadge } from '@/features/tasks/components/task-status-badge';

import { selectDueSoon } from '../due-soon';

function DueSoonCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <CardTitle>
          <h2 className="text-lg font-semibold">Due soon</h2>
        </CardTitle>
        <CardDescription>Next 7 days</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** The unfinished tasks due in the next 7 days, soonest first, from the cached task list. */
export function DueSoonList() {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery(
    taskListQueryOptions(),
  );

  if (isPending) {
    return (
      <DueSoonCard>
        <div role="status" aria-label="Loading due tasks" className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </DueSoonCard>
    );
  }

  if (isError) {
    return (
      <DueSoonCard>
        <Alert variant="destructive">
          <AlertTitle>Could not load due tasks</AlertTitle>
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

  const tasks = selectDueSoon(data);

  if (tasks.length === 0) {
    return (
      <DueSoonCard>
        <p className="text-muted-foreground">
          Nothing due this week. <Link to="/tasks" className="underline">Plan the next task</Link>.
        </p>
      </DueSoonCard>
    );
  }

  return (
    <DueSoonCard>
      <ul aria-label="Due soon" className="divide-y border-t">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <Link to={`/tasks/${task.id}`} className="font-semibold hover:underline">
                {task.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                Due {task.dueDate === null ? '' : formatDueDate(task.dueDate)}
              </p>
            </div>
            <TaskStatusBadge status={task.status} />
          </li>
        ))}
      </ul>
    </DueSoonCard>
  );
}
