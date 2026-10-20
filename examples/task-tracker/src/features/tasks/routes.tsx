import type { RouteObject } from 'react-router';

/**
 * Lazy, so the feature is split into its own chunk and loaded on first visit. A function so
 * each router gets fresh route objects (see src/app/routes.tsx).
 */
export const taskRoutes = (): RouteObject[] => [
  {
    path: 'tasks',
    lazy: {
      Component: async () => (await import('./components/tasks-page')).TasksPage,
    },
  },
  {
    path: 'tasks/:id',
    lazy: {
      Component: async () => (await import('./components/task-detail-page')).TaskDetailPage,
    },
  },
];
