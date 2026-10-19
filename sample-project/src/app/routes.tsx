import { data, redirect, type RouteObject } from 'react-router';

import { authRoutes } from '@/features/auth/routes';
import { getSession } from '@/lib/session';

import { HomePage } from './home-page';
import { RootLayout } from './root-layout';
import { RouteError } from './route-error';

/**
 * Builds the route tree. A function, not a shared array: React Router mutates route objects
 * (it empties a `lazy` object once it has loaded), so every router — the app's one and each
 * test's memory router — needs fresh objects. Feature routes go in `children`, spread from
 * `src/features/<name>/routes.tsx`; the auth pages sit beside the root route instead, because
 * they must not get its sidebar and header.
 */
export const createRoutes = (): RouteObject[] => [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteError,
    // Everything under `/` needs a session. The header reads it back with useLoaderData, so it
    // keeps its user while a sign-out clears storage and navigates away.
    loader: () => getSession() ?? redirect('/login'),
    children: [
      { index: true, Component: HomePage },
      {
        // Unknown URLs render inside the layout, so the sidebar and header stay. The root
        // ErrorBoundary is left for errors thrown by the layout itself.
        path: '*',
        loader: () => {
          // React Router's idiom: a thrown data() is what routes to the ErrorBoundary.
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw data(null, { status: 404, statusText: 'Not Found' });
        },
        ErrorBoundary: RouteError,
      },
    ],
  },
  ...authRoutes(),
];
