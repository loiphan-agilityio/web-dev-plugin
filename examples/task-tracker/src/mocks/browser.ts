import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** MSW for `pnpm dev:mock` (VITE_API_MOCKING=true) and Storybook. Started in src/main.tsx. */
export const worker = setupWorker(...handlers);
