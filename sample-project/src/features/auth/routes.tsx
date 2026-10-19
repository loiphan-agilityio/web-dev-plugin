import { redirect, type RouteObject } from 'react-router';

import { RouteError } from '@/app/route-error';
import { getSession } from '@/lib/session';

import { AuthLayout } from './components/auth-layout';

/**
 * Sits beside the app's root route, not inside it: no sidebar or header. A function so each
 * router gets fresh route objects (see src/app/routes.tsx).
 */
export const authRoutes = (): RouteObject[] => [
  {
    Component: AuthLayout,
    ErrorBoundary: RouteError,
    // Already signed in: nothing to do here.
    loader: () => (getSession() ? redirect('/') : null),
    children: [
      {
        path: 'login',
        lazy: { Component: async () => (await import('./components/login-page')).LoginPage },
      },
      {
        path: 'register',
        lazy: { Component: async () => (await import('./components/register-page')).RegisterPage },
      },
    ],
  },
];
