import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { taskStatsQueryOptions } from '@/features/tasks/queries';

import { completionRate } from '../due-soon';

/** Loading, error and success. There is no empty state: zero tasks is just a row of zeros. */
export function StatsCards() {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery(
    taskStatsQueryOptions(),
  );

  if (isPending) {
    return (
      <div role="status" aria-label="Loading statistics" className="space-y-6">
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
        <AlertTitle>Could not load statistics</AlertTitle>
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

  const rate = completionRate(data.done, data.total);
  const counts = [
    { label: 'Total tasks', value: data.total, className: '' },
    { label: 'In progress', value: data.inProgress, className: '' },
    { label: 'Done', value: data.done, className: '' },
    { label: 'Overdue', value: data.overdue, className: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      <ul aria-label="Task counts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counts.map(({ label, value, className }) => (
          <li key={label} aria-label={label}>
            <Card className="h-full gap-2 py-6">
              <CardHeader className="gap-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className={cn('text-3xl font-semibold tabular-nums', className)}>
                  {value}
                </CardTitle>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="gap-3">
        <CardHeader className="grid-cols-[1fr_auto] items-center">
          <CardTitle className="font-semibold">Completion</CardTitle>
          <CardDescription className="text-right">
            {data.done} of {data.total} done · {rate}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* The generated Progress keeps `value` for itself, so the value is announced explicitly. */}
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
}
