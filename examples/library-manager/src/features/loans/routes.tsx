import type { RouteObject } from 'react-router';

/**
 * Lazy, so the feature is split into its own chunk and loaded on first visit. A function so
 * each router gets fresh route objects (see src/app/routes.tsx).
 */
export const loanRoutes = (): RouteObject[] => [
  {
    path: 'loans',
    lazy: {
      Component: async () => (await import('./components/loans-page')).LoansPage,
    },
  },
];
