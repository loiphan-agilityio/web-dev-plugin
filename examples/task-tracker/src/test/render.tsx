import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createRoutes } from '@/app/routes';
import { Toaster } from '@/components/ui/sonner';

import { createTestQueryClient } from './query-client';

const renderRouter = (routes: RouteObject[], path: string) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* As in AppProviders, so tests can assert toasts with findByText. */}
      <Toaster richColors />
    </QueryClientProvider>,
  );
  return { ...result, user, queryClient, router };
};

/** Renders the real app route tree at `path`. Use for page-level tests. */
export const renderRoute = (path: string) => renderRouter(createRoutes(), path);

/**
 * Renders one component inside the app's providers and a router (so `Link` works). `pattern` is
 * the route pattern when it differs from the URL, e.g. `{ path: '/tasks/1', pattern: '/tasks/:id' }`.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { path = '/', pattern }: { path?: string; pattern?: string } = {},
) => renderRouter([{ path: pattern ?? path, element: ui }], path);
