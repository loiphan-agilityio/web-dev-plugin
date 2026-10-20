import type { RequestHandler } from 'msw';

import { createLibraryHandlers } from './library-handlers';

/**
 * Every MSW handler, used by the test server and by the browser worker (`pnpm dev:mock`,
 * Storybook). Each feature exports its own from `src/features/<name>/mocks.ts`; they share one
 * in-memory db (see `createLibraryHandlers`), so a loan changes the copies a book shows.
 */
export const handlers: RequestHandler[] = createLibraryHandlers();
