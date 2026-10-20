import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoanReturnButton } from '@/features/loans/components/loan-return-button';
import { loanListQueryOptions } from '@/features/loans/queries';
import { toUserMessage } from '@/lib/api/errors';
import { daysBetween, today } from '@/lib/dates';

/** The overdue loans, longest overdue first, each with a Return button. */
export const OverdueTable = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(loanListQueryOptions());

  if (isPending) {
    return (
      <div role="status" aria-label="Loading overdue loans" className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the overdue loans</AlertTitle>
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

  const overdue = data
    .filter(({ status }) => status === 'overdue')
    .toSorted((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (overdue.length === 0) {
    return <p className="text-muted-foreground">No overdue loans.</p>;
  }

  return (
    <Table aria-label="Overdue loans">
      <TableHeader>
        <TableRow>
          <TableHead>Book</TableHead>
          <TableHead>Member</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Days overdue</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overdue.map((loan) => (
          <TableRow key={loan.id}>
            <TableCell className="font-medium">{loan.bookTitle}</TableCell>
            <TableCell>{loan.memberName}</TableCell>
            <TableCell>{loan.dueDate}</TableCell>
            <TableCell className="text-destructive">{daysBetween(loan.dueDate, today())}</TableCell>
            <TableCell className="text-right">
              <LoanReturnButton loan={loan} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
