import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { LinkList } from './link-list';

export function LinksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Anything that is not a positive integer (?page=abc, ?page=0, ?page=-2) is page 1.
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '', 10) || 1);

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>
          <h1>Links</h1>
        </CardTitle>
        <CardAction>
          <Button asChild>
            <Link to="/links/new">Create link</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <LinkList
          page={page}
          onPageChange={(next) => {
            setSearchParams(next === 1 ? {} : { page: String(next) });
          }}
        />
      </CardContent>
    </Card>
  );
}
