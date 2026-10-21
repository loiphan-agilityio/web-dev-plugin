import '@testing-library/jest-dom/vitest';

import { configure } from '@testing-library/react';
import { toast } from 'sonner';

import { server } from '@/mocks/server';

// Feature routes are lazy, and coverage instrumentation slows their first load: the default 1s
// for findBy* / waitFor times out now and then on a page test. A real failure still fails.
configure({ asyncUtilTimeout: 3000 });

// jsdom has no matchMedia; sonner's Toaster (mounted by src/test/render.tsx) reads it for the
// system theme.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// 'error' makes a request with no matching handler fail the test instead of hitting the network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
// sonner keeps toasts in a module-level store; without this a toast from one test shows up in the
// next test's Toaster.
beforeEach(() => {
  toast.dismiss();
});
// Drop per-test overrides added with server.use().
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
