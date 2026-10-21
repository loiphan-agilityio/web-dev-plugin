import { QueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/lib/api/errors';

declare module '@tanstack/react-query' {
  interface Register {
    /** `runEffect` rejects with an `ApiError`, so that is the type of every `query.error`. */
    defaultError: ApiError;
  }
}

/** Only failures that can succeed on a second try are retried; 4xx answers will not change. */
const isTransient = (error: ApiError) =>
  error._tag === 'NetworkError' || (error._tag === 'ServerError' && error.status >= 500);

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetching the same data on every route change.
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 1 && isTransient(error),
      },
      // Mutations are not idempotent: never retry them automatically.
      mutations: { retry: 0 },
    },
  });
