import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { runEffect } from '@/lib/api/run';

import { createBook, deleteBook, listBooks, updateBook } from './api';
import type { NewBook } from './schemas';

/** Every book query key comes from here, so invalidation can target exactly what changed. */
export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
};

export const bookListQueryOptions = () =>
  queryOptions({
    queryKey: bookKeys.lists(),
    queryFn: ({ signal }) => runEffect(listBooks(), signal),
  });

export const useCreateBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewBook) => runEffect(createBook(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookKeys.lists() }),
  });
};

export const useUpdateBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: NewBook }) => runEffect(updateBook(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookKeys.lists() }),
  });
};

/** The toast lives here: the deleted book's row unmounts, taking `mutate`'s callbacks with it. */
export const useDeleteBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => runEffect(deleteBook(id)),
    onSuccess: () => {
      toast.success('Book deleted');
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
};
