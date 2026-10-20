import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { runEffect } from '@/lib/api/run';

import { createTask, deleteTask, getTask, getTaskStats, listTasks, updateTask } from './api';
import type { NewTask, TaskPatch } from './schemas';

/** Every task query key comes from here, so invalidation can target exactly what changed. */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
  detail: (id: number) => [...taskKeys.all, 'detail', id] as const,
};

export const taskListQueryOptions = () =>
  queryOptions({
    queryKey: taskKeys.lists(),
    queryFn: ({ signal }) => runEffect(listTasks(), signal),
  });

export const taskStatsQueryOptions = () =>
  queryOptions({
    queryKey: taskKeys.stats(),
    queryFn: ({ signal }) => runEffect(getTaskStats(), signal),
  });

export const taskDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => runEffect(getTask(id), signal),
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTask) => runEffect(createTask(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.stats() }),
      ]),
  });
};

export const useUpdateTask = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: TaskPatch) => runEffect(updateTask(id, patch)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) }),
      ]),
  });
};

export const useDeleteTask = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runEffect(deleteTask(id)),
    onSuccess: () => {
      // The detail is gone for good: drop it instead of refetching a 404.
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: taskKeys.stats() }),
      ]);
    },
  });
};
