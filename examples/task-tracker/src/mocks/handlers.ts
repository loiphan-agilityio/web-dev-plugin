import type { RequestHandler } from 'msw';

import { tasksHandlers } from '@/features/tasks/mocks';

/**
 * Every MSW handler, used by the test server and by the browser worker (`pnpm dev:mock`,
 * Storybook). Each feature exports its own from `src/features/<name>/mocks.ts`; spread them here.
 */
export const handlers: RequestHandler[] = [...tasksHandlers];
