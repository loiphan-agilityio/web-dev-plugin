import '@/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '@/app/providers';
import { createRoutes } from '@/app/routes';
import { config } from '@/lib/config';

// import.meta.env.DEV is false in `vite build`, so MSW is tree-shaken out of production.
if (import.meta.env.DEV && config.apiMocking) {
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

// The demo build (VITE_DEMO=true) runs where service workers are blocked and the URL path is
// unknown, e.g. a claude.ai Artifact: mock in-page and route in memory.
const demo = import.meta.env.VITE_DEMO === 'true';
if (demo) {
  const { installDemoFetch } = await import('@/mocks/demo');
  installDemoFetch();
}

const router = demo
  ? createMemoryRouter(createRoutes(), { initialEntries: ['/'] })
  : createBrowserRouter(createRoutes());
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
