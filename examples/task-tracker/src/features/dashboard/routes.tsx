import type { RouteObject } from 'react-router';

/** The home page. Lazy and a function for the same reasons as `taskRoutes` (see src/app/routes.tsx). */
export const dashboardRoutes = (): RouteObject[] => [
  {
    index: true,
    lazy: {
      Component: async () => (await import('./components/dashboard-page')).DashboardPage,
    },
  },
];
