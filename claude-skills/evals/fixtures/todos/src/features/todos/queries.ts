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

export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTodo) => runEffect(createTodo(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
  });
};
