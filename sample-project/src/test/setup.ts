import '@testing-library/jest-dom/vitest';

import { toast } from 'sonner';

import { server } from '@/mocks/server';

// jsdom has neither: use-mobile (sidebar) and sonner's Toaster (mounted by src/test/render.tsx)
// need matchMedia, Radix popper (dropdowns) needs ResizeObserver.
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
// sonner keeps toasts in a module-level store; without this a toast from one test shows up in the
// next test's Toaster.
beforeEach(() => {
  toast.dismiss();
});
// Drop per-test overrides added with server.use(), and the session a test signed in with.
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => {
  server.close();
});
