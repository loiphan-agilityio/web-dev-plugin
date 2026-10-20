import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toUserMessage } from '@/lib/api/errors';
import { daysBetween, today } from '@/lib/dates';

import { loanListQueryOptions } from '../queries';
import type { Loan, LoanStatus } from '../schemas';
import { LoanReturnButton } from './loan-return-button';

const tabs: { value: '' | LoanStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
];

const isStatus = (value: string): value is LoanStatus =>
  value === 'active' || value === 'overdue' || value === 'returned';

const matches = ({ bookTitle, memberName }: Loan, query: string) =>
  [bookTitle, memberName].some((text) => text.toLowerCase().includes(query));

/** Open loans first, the one due soonest on top; returned loans after, the latest return first. */
const byUrgency = (a: Loan, b: Loan) => {
  if (a.returnedAt === null && b.returnedAt === null) return a.dueDate.localeCompare(b.dueDate);
  if (a.returnedAt === null) return -1;
  if (b.returnedAt === null) return 1;
  return b.returnedAt.localeCompare(a.returnedAt);
};

const StatusCell = ({ loan }: { loan: Loan }) => {
  const { status, returnedAt, dueDate } = loan;
  if (status === 'returned') {
    return (
      <div className="space-y-1">
        <Badge variant="outline">Returned</Badge>
        <p className="text-xs text-muted-foreground">{`Returned ${returnedAt ?? ''}`}</p>
      </div>
    );
  }
  if (status === 'overdue') {
    const days = daysBetween(dueDate, today());
    return (
      <div className="space-y-1">
        <Badge variant="destructive">Overdue</Badge>
        <p className="text-xs text-destructive">{`${days} ${days === 1 ? 'day' : 'days'} overdue`}</p>
      </div>
    );
  }
  return <Badge variant="secondary">Active</Badge>;
};

/** Loading, error, empty, no-match and success are five different screens. Filters live in the URL. */
export const LoanList = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(loanListQueryOptions());
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const status = isStatus(statusParam) ? statusParam : '';

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  if (isPending) {
    return (
      <div role="status" aria-label="Loading loans" className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load loans</AlertTitle>
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
    return <p className="text-muted-foreground">No loans yet. Lend the first book above.</p>;
  }

  const needle = query.trim().toLowerCase();
  const loans = data
    .filter((loan) => matches(loan, needle) && (status === '' || loan.status === status))
    .toSorted(byUrgency);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter by status" className="flex gap-1">
          {tabs.map(({ value, label }) => (
            <Button
              key={label}
              type="button"
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              aria-pressed={status === value}
              onClick={() => {
                setParam('status', value);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <Input
          type="search"
          aria-label="Search loans"
          placeholder="Search book or member"
          className="max-w-xs"
          value={query}
          onChange={(event) => {
            setParam('q', event.target.value);
          }}
        />
      </div>
      {loans.length === 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground">No loans match your filters.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchParams({}, { replace: true });
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <Table aria-label="Loans">
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Borrowed</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.bookTitle}</TableCell>
                <TableCell>{loan.memberName}</TableCell>
                <TableCell>{loan.borrowedAt}</TableCell>
                <TableCell>{loan.dueDate}</TableCell>
                <TableCell>
                  <StatusCell loan={loan} />
                </TableCell>
                <TableCell className="text-right">
                  {loan.status !== 'returned' && <LoanReturnButton loan={loan} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
