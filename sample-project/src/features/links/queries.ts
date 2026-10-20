import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { runEffect } from '@/lib/api/run';

import { createLink, listLinks } from './api';
import type { NewLink } from './schemas';

export const PAGE_SIZE = 20;

/** Every link query key comes from here, so invalidation can target exactly what changed. */
export const linkKeys = {
  all: ['links'] as const,
  lists: () => [...linkKeys.all, 'list'] as const,
  list: (page: number) => [...linkKeys.lists(), { page }] as const,
};

/** `page` is 1-based. The previous page stays on screen while the next one loads. */
export const linkListQueryOptions = (page: number) =>
  queryOptions({
    queryKey: linkKeys.list(page),
    queryFn: ({ signal }) =>
      runEffect(listLinks({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }), signal),
    placeholderData: keepPreviousData,
  });

export const useCreateLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewLink) => runEffect(createLink(input)),
    // A new link is the newest, so it shifts every page: invalidate all of them. Returning the
    // promise keeps the mutation pending until the visible page has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKeys.lists() }),
  });
};
