import { getResponse } from 'msw/utils/get-response';

import { handlers } from './handlers';

/**
 * Demo build only (VITE_DEMO=true): answers API calls from the MSW handlers in the page, with
 * no service worker, for hosts that block service workers. Unhandled requests go to the real
 * fetch. Installed in src/main.tsx.
 */
export const installDemoFetch = () => {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const response = await getResponse(handlers, request.clone());
    return response ?? originalFetch(request);
  };
};
