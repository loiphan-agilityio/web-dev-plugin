import type { RouteObject } from 'react-router';

import { HomePage } from './home-page';
import { RootLayout } from './root-layout';
import { RouteError } from './route-error';

/**
 * Builds the route tree. A function, not a shared array: React Router mutates route objects
 * (it empties a `lazy` object once it has loaded), so every router — the app's one and each
 * test's memory router — needs fresh objects. Feature routes go in `children`, spread from
 * `src/features/<name>/routes.tsx`.
 */
export const createRoutes = (): RouteObject[] => [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [{ index: true, Component: HomePage }],
  },
];
