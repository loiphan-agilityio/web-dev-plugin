import { Navigate, type RouteObject } from 'react-router';

import { bookRoutes } from '@/features/books/routes';
import { loanRoutes } from '@/features/loans/routes';
import { memberRoutes } from '@/features/members/routes';
import { overviewRoutes } from '@/features/overview/routes';

import { RootLayout } from './root-layout';
import { RouteError } from './route-error';

/**
 * Builds the route tree. A function, not a shared array: React Router mutates route objects
 * (it empties a `lazy` object once it has loaded), so every router — the app's one and each
 * test's memory router — needs fresh objects. Feature routes go in `children`, spread from
 * `src/features/<name>/routes.tsx`. The app opens on the Loans page, the librarian's daily task.
 */
export const createRoutes = (): RouteObject[] => [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, element: <Navigate to="/loans" replace /> },
      ...loanRoutes(),
      ...bookRoutes(),
      ...memberRoutes(),
      ...overviewRoutes(),
    ],
  },
];
