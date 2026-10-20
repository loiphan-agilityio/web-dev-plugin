import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
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

import { memberListQueryOptions } from '../queries';
import type { Member } from '../schemas';
import { MemberDeleteButton } from './member-delete-button';

const matches = ({ name, email }: Member, query: string) =>
  [name, email].some((text) => text.toLowerCase().includes(query));

/** Loading, error, empty, no-match and success are five different screens. Filters live in the URL. */
export const MemberList = ({ onEdit }: { onEdit: (member: Member) => void }) => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(memberListQueryOptions());
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';

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
      <div role="status" aria-label="Loading members" className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load members</AlertTitle>
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
    return <p className="text-muted-foreground">No members yet. Add the first one above.</p>;
  }

  const needle = query.trim().toLowerCase();
  const members = data.filter(
    (member) => matches(member, needle) && (status === '' || member.status === status),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          type="search"
          aria-label="Search members"
          placeholder="Search name or email"
          className="max-w-xs"
          value={query}
          onChange={(event) => {
            setParam('q', event.target.value);
          }}
        />
        <NativeSelect
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setParam('status', event.target.value);
          }}
        >
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          <NativeSelectOption value="active">Active</NativeSelectOption>
          <NativeSelectOption value="suspended">Suspended</NativeSelectOption>
        </NativeSelect>
      </div>
      {members.length === 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground">No members match your filters.</p>
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
        <Table aria-label="Members">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.phone || 'No phone'}</TableCell>
                <TableCell>
                  {member.status === 'active' ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Suspended</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${member.name}`}
                      onClick={() => {
                        onEdit(member);
                      }}
                    >
                      Edit
                    </Button>
                    <MemberDeleteButton member={member} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
