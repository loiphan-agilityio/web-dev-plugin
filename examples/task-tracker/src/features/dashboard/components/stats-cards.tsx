import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { taskStatsQueryOptions } from '@/features/tasks/queries';
import { toUserMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

import { completionRate } from '../due-soon';

/** Loading, error and success. There is no empty state: with no tasks every count is 0. */
export const StatsCards = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(taskStatsQueryOptions());

  if (isPending) {
    return (
      <div role="status" aria-label="Loading stats" className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-27" />
          <Skeleton className="h-27" />
          <Skeleton className="h-27" />
          <Skeleton className="h-27" />
        </div>
        <Skeleton className="h-21" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the stats</AlertTitle>
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

  const rate = completionRate(data);
  const counts = [
    { label: 'Total tasks', value: data.total, valueClass: '' },
    { label: 'In progress', value: data.inProgress, valueClass: '' },
    { label: 'Done', value: data.done, valueClass: '' },
    { label: 'Overdue', value: data.overdue, valueClass: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <ul aria-label="Task counts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map(({ label, value, valueClass }) => (
          <li key={label}>
            <Card>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className={cn('text-3xl font-bold tabular-nums', valueClass)}>
                  {value}
                </CardTitle>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader>
          <CardTitle>Completion</CardTitle>
          <CardAction className="text-sm text-muted-foreground">
            {data.done} of {data.total} done · {rate}%
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* The shadcn Progress keeps `value` to itself, so the ARIA value is set here. */}
          <Progress
            value={rate}
            aria-valuenow={rate}
            aria-label="Completion rate"
            className="h-2.5"
          />
        </CardContent>
      </Card>
    </div>
  );
};
