import { QueryClient } from '@tanstack/react-query';

/** A fresh client per test or story: no shared cache, no retries (a failure shows up immediately). */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  });
