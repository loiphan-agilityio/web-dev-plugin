import type { RequestHandler } from 'msw';

/**
 * Every MSW handler, used by the test server and (with VITE_API_MOCKING=true) the browser
 * worker. Each feature exports its own from `src/features/<name>/mocks.ts`; spread them here.
 */
export const handlers: RequestHandler[] = [];
