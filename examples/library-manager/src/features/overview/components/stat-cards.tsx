import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { loanStatsQueryOptions } from '@/features/loans/queries';
import type { LoanStats } from '@/features/loans/schemas';
import { toUserMessage } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

const cards: { key: keyof LoanStats; label: string; warn?: boolean }[] = [
  { key: 'books', label: 'Books' },
  { key: 'members', label: 'Members' },
  { key: 'activeLoans', label: 'Active loans' },
  { key: 'overdueLoans', label: 'Overdue loans', warn: true },
  { key: 'dueThisWeek', label: 'Due this week' },
];

/** The library's numbers. Loading, error and success; there is no empty state for a count. */
export const StatCards = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(loanStatsQueryOptions());

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Loading statistics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {cards.map(({ key }) => (
          <Skeleton key={key} className="h-24" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the statistics</AlertTitle>
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
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ key, label, warn }) => (
        <Card key={key} size="sm">
          <CardHeader>
            <CardTitle>
              <dt className="text-sm font-normal text-muted-foreground">{label}</dt>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dd
              className={cn(
                'font-heading text-3xl font-semibold',
                warn && data[key] > 0 && 'text-destructive',
              )}
            >
              {data[key]}
            </dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
};
