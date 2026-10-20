import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';

import { formatDateTime } from '../format';
import { linkListQueryOptions, PAGE_SIZE } from '../queries';
import { CopyLinkButton } from './copy-link-button';

/** `page` is 1-based and comes from the URL, which `LinksPage` owns. */
export function LinkList({
  page,
  onPageChange,
}: {
  readonly page: number;
  readonly onPageChange: (page: number) => void;
}) {
  const {
    data,
    dataUpdatedAt,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    isPlaceholderData,
  } = useQuery(linkListQueryOptions(page));

  // isPending is true only before the first result: while the next page loads, the previous
  // one stays (placeholderData), so paging never flashes the skeleton.
  if (isPending) {
    return (
      <div role="status" aria-label="Loading links" className="space-y-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load links</AlertTitle>
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

  if (data.total === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">You have no links yet.</p>
        <Button asChild>
          <Link to="/links/new">Create your first link</Link>
        </Button>
      </div>
    );
  }

  // A stale bookmark such as ?page=9 when only three pages exist.
  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">There are no links on page {page}.</p>
        <Button asChild variant="outline">
          <Link to="/links">Back to the first page</Link>
        </Button>
      </div>
    );
  }

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + data.items.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Links" aria-busy={isPlaceholderData} className="divide-y rounded-lg border">
        {data.items.map((link) => {
          // shortcut: judged as of the last fetch (render must not read the clock), so a row flips
          // to Expired on the next refetch, and not while the next page is loading; upgrade to a
          // ticking clock if that matters.
          const expired = link.expiresAt !== null && Date.parse(link.expiresAt) <= dataUpdatedAt;
          return (
            <li
              key={link.code}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium break-all underline underline-offset-4"
                  >
                    {link.shortUrl}
                  </a>
                  {expired && <Badge variant="destructive">Expired</Badge>}
                </div>
                <p className="text-sm break-all text-muted-foreground">{link.url}</p>
                <p className="text-xs text-muted-foreground">
                  {link.clicks} {link.clicks === 1 ? 'click' : 'clicks'} · Created{' '}
                  <time dateTime={link.createdAt}>{formatDateTime(link.createdAt)}</time>
                  {link.expiresAt && (
                    <>
                      {' '}
                      · Expires{' '}
                      <time dateTime={link.expiresAt}>{formatDateTime(link.expiresAt)}</time>
                    </>
                  )}
                </p>
              </div>
              {/* Every row has a Copy button, so the name says which link it copies. */}
              <CopyLinkButton
                url={link.shortUrl}
                variant="outline"
                size="sm"
                aria-label={`Copy ${link.shortUrl}`}
              />
            </li>
          );
        })}
      </ul>
      {data.total > PAGE_SIZE && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {first}–{last} of {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                onPageChange(page - 1);
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={last >= data.total || isPlaceholderData}
              onClick={() => {
                onPageChange(page + 1);
              }}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
