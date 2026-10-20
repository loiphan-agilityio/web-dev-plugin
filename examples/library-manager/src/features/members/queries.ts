import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { runEffect } from '@/lib/api/run';

import { createMember, deleteMember, listMembers, updateMember } from './api';
import type { NewMember } from './schemas';

/** Every member query key comes from here, so invalidation can target exactly what changed. */
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
};

export const memberListQueryOptions = () =>
  queryOptions({
    queryKey: memberKeys.lists(),
    queryFn: ({ signal }) => runEffect(listMembers(), signal),
  });

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewMember) => runEffect(createMember(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.lists() }),
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: NewMember }) =>
      runEffect(updateMember(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.lists() }),
  });
};

/** The toast lives here: the deleted member's row unmounts, taking `mutate`'s callbacks with it. */
export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => runEffect(deleteMember(id)),
    onSuccess: () => {
      toast.success('Member deleted');
      return queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
};
