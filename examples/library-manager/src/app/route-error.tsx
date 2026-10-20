import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Rendered when a route throws while rendering, or the URL matches no route. */
export const RouteError = () => {
  const error = useRouteError();
  const isResponse = isRouteErrorResponse(error);
  const title = isResponse && error.status === 404 ? 'Page not found' : 'Something went wrong';

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {isResponse ? error.statusText : 'An unexpected error occurred.'}
        </AlertDescription>
      </Alert>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </main>
  );
};
