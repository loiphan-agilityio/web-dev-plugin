import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** MSW for `pnpm dev` with VITE_API_MOCKING=true. Started in src/main.tsx. */
export const worker = setupWorker(...handlers);
