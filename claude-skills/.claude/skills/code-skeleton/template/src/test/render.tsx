import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { createRoutes } from '@/app/routes';
import { Toaster } from '@/components/ui/sonner';

/** A fresh client per test: no shared cache, no retries (a failure shows up immediately). */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });

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

/** Renders one component inside the app's providers and a router (so `Link` works). */
export const renderWithProviders = (ui: ReactElement, { path = '/' } = {}) =>
  renderRouter([{ path, element: ui }], path);
