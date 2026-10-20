import { type QueryClient, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ApiError } from '@/lib/api/errors';
import { runEffect } from '@/lib/api/run';

import { createTask, deleteTask, getTask, getTaskStats, listTasks, updateTask } from './api';
import type { NewTask, TaskPatch } from './schemas';

/** Every task query key comes from here, so invalidation can target exactly what changed. */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: number) => [...taskKeys.details(), id] as const,
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

/** A write changes the lists and the dashboard numbers: refetch both, and wait for both. */
const invalidateTasks = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: taskKeys.stats() }),
  ]);

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTask) => runEffect(createTask(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () => invalidateTasks(queryClient),
  });
};

/** A 404 on a write means someone else deleted the task: say so and refresh the list. */
const useTaskGone = () => {
  const queryClient = useQueryClient();
  return (error: ApiError) => {
    if (error._tag !== 'NotFoundError') {
      return undefined;
    }
    toast.error('This task no longer exists');
    return invalidateTasks(queryClient);
  };
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const handleGone = useTaskGone();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: TaskPatch }) =>
      runEffect(updateTask(id, patch)),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      return invalidateTasks(queryClient);
    },
    onError: handleGone,
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const handleGone = useTaskGone();
  return useMutation({
    mutationFn: (id: number) => runEffect(deleteTask(id)),
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      await invalidateTasks(queryClient);
    },
    onError: handleGone,
  });
};
