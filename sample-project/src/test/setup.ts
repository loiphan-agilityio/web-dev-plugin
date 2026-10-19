import '@testing-library/jest-dom/vitest';

import { server } from '@/mocks/server';

// jsdom has neither: use-mobile (sidebar) needs matchMedia, Radix popper (dropdowns) needs ResizeObserver.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }) as unknown as MediaQueryList;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 'error' makes a request with no matching handler fail the test instead of hitting the network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
// Drop per-test overrides added with server.use(), and the session a test signed in with.
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => {
  server.close();
});
