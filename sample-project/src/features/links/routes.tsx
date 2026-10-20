import type { RouteObject } from 'react-router';

/**
 * Lazy, so the feature is split into its own chunk and loaded on first visit. A function so
 * each router gets fresh route objects (see src/app/routes.tsx).
 */
export const linkRoutes = (): RouteObject[] => [
  {
    path: 'links',
    lazy: {
      Component: async () => (await import('./components/links-page')).LinksPage,
    },
  },
  {
    path: 'links/new',
    lazy: {
      Component: async () => (await import('./components/create-link-page')).CreateLinkPage,
    },
  },
];
