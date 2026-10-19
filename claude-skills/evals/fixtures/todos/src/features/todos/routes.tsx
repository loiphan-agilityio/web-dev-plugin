import type { RouteObject } from 'react-router';

/**
 * Lazy, so the feature is split into its own chunk and loaded on first visit. A function so
 * each router gets fresh route objects (see src/app/routes.tsx).
 */
export const todoRoutes = (): RouteObject[] => [
  {
    path: 'todos',
    lazy: {
      Component: async () => (await import('./components/todos-page')).TodosPage,
    },
  },
];
