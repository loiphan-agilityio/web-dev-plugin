import { Button } from '@/components/ui/button';

import { formatDateTime } from '../format';
import type { Link } from '../schemas';
import { CopyLinkButton } from './copy-link-button';

export function CreatedLink({
  link,
  onCreateAnother,
}: {
  readonly link: Link;
  readonly onCreateAnother: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Your short link</p>
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="text-lg font-semibold break-all underline underline-offset-4"
        >
          {link.shortUrl}
        </a>
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        <div>
          <dt className="inline text-muted-foreground">Redirects to: </dt>
          <dd className="inline break-all">{link.url}</dd>
        </div>
        {link.expiresAt && (
          <div>
            <dt className="inline text-muted-foreground">Expires: </dt>
            <dd className="inline">
              <time dateTime={link.expiresAt}>{formatDateTime(link.expiresAt)}</time>
            </dd>
          </div>
        )}
      </dl>
      <div className="flex gap-2">
        <CopyLinkButton url={link.shortUrl} />
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Create another
        </Button>
      </div>
    </div>
  );
}
