import type { RequestHandler } from 'msw';

import { authHandlers } from '@/features/auth/mocks';
import { linksHandlers } from '@/features/links/mocks';

/**
 * Every MSW handler, used by the test server (`src/mocks/server.ts`). Each feature exports its
 * own from `src/features/<name>/mocks.ts`; spread them here.
 */
export const handlers: RequestHandler[] = [...authHandlers, ...linksHandlers];
