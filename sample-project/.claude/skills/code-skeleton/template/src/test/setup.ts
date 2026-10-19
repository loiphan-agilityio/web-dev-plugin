import '@testing-library/jest-dom/vitest';

import { server } from '@/mocks/server';

// 'error' makes a request with no matching handler fail the test instead of hitting the network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
// Drop per-test overrides added with server.use().
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
