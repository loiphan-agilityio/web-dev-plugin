import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Rendered when a route throws while rendering, or the URL matches no route. */
export function RouteError() {
  const error = useRouteError();
  const title =
    isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : 'Something went wrong';

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {isRouteErrorResponse(error) ? error.statusText : 'An unexpected error occurred.'}
        </AlertDescription>
      </Alert>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </main>
  );
}
