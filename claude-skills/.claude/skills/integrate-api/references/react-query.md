# TanStack Query 5 with runEffect

Object syntax only. `isPending` is the first-load state (not `isLoading`). Retries come from `createQueryClient` only.

## `runEffect`: the bridge

```ts
export const runEffect = async <A, E extends ApiError>(
  effect: Effect.Effect<A, E, AppServices>,
  signal?: AbortSignal,
): Promise<A> => {
  const exit = await runtime.runPromiseExit(effect, { signal });
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (Option.isSome(failure)) throw failure.value;
  // Defects (bugs) and interruptions: rethrow as-is so they surface instead of hiding.
  throw Cause.squash(exit.cause);
};
```

- A typed failure is thrown as the `ApiError` itself, so `query.error._tag` is safe to switch on.
- Pass the query's `signal` so cancellation interrupts the fiber and aborts the fetch. Mutations have no signal.
- `E extends ApiError` means an `Effect.fn` that can fail with anything else will not compile here.

## Query client policy (`src/lib/query-client.ts`)

```ts
declare module '@tanstack/react-query' {
  interface Register { defaultError: ApiError; }
}
const isTransient = (error: ApiError) =>
  error._tag === 'NetworkError' || error._tag === 'ServerError';

queries: { staleTime: 30_000, retry: (failureCount, error) => failureCount < 1 && isTransient(error) },
mutations: { retry: 0 },
```

Do not set per-query `retry` or add `HttpClient.retryTransient`.

## Keys and query options (`features/<name>/queries.ts`)

```ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { runEffect } from '@/lib/api/run';

import { createTodo, listTodos } from './api';
import type { NewTodo } from './schemas';

/** Every todo query key comes from here, so invalidation can target exactly what changed. */
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
};

export const todoListQueryOptions = () =>
  queryOptions({
    queryKey: todoKeys.lists(),
    queryFn: ({ signal }) => runEffect(listTodos(), signal),
  });
```

Components use `useQuery(todoListQueryOptions())`. Because it is `queryOptions`, the same object works with `queryClient.prefetchQuery`, `ensureQueryData` (route loaders) and `setQueryData` with correct types.

Adding a detail endpoint: extend the same pattern (the key hierarchy `all -> lists / details -> detail(id)` lets you invalidate a whole branch). This is the standard TanStack Query key-factory convention; the todos example has only `lists()`, so check the result with `pnpm check`:

```ts
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};
```

Filters and pagination go into the key (`[...todoKeys.lists(), { status }]`) and into `urlParams`, so each filter is a separate cache entry.

## Mutation hook

```ts
export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTodo) => runEffect(createTodo(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
  });
};
```

Name `use<Action><Name>`. Invalidate exactly the keys the write changes: the lists the item can appear in, and the detail key of that item for update/delete. Return the promise.

Call-site error handling (from `todo-form.tsx`):

```ts
createTodo.mutate(values, {
  onSuccess: () => { /* reset the form */ },
  onError: (error) => { setFormErrors(form.setError, error); },
});
```

## Invalidate vs setQueryData

- Default: **invalidate**. Simple, always correct, one extra request.
- **`setQueryData`** when the response already contains the new truth and a refetch would be wasteful or flicker (e.g. an update returning the full item). Use it for the detail key, and still invalidate lists. Pattern (standard TanStack Query 5 API; not in the todos example):
  ```ts
  onSuccess: (updated) => {
    queryClient.setQueryData(todoKeys.detail(updated.id), updated);
    return queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
  },
  ```
- Optimistic updates (`onMutate` + rollback) only when asked; they need a test for the rollback on 500.
- After a delete, `removeQueries` the detail key, then invalidate lists, so a stale detail page cannot be shown.

## Testing invalidation

Drive it through the UI with in-memory handlers: render the list with `createTodosHandlers([])`, perform the mutation, and `await screen.findByRole('list', ...)`; if the new item shows, the list refetched. See `todos-page.test.tsx` in [msw.md](msw.md). Each test gets a fresh `QueryClient` from `renderRoute` / `renderWithProviders` (returned as `queryClient` when you need to inspect the cache).
