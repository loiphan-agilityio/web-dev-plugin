import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { type NewTask, Task, TaskList, type TaskPatch, TaskStats } from './schemas';

export const listTasks = Effect.fn('tasks.list')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/tasks', TaskList);
});

export const getTaskStats = Effect.fn('tasks.stats')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/tasks/stats', TaskStats);
});

export const createTask = Effect.fn('tasks.create')(function* (input: NewTask) {
  const api = yield* ApiClient;
  return yield* api.post('/tasks', { ...input, dueDate: input.dueDate || null }, Task);
});

export const getTask = Effect.fn('tasks.get')(function* (id: number) {
  const api = yield* ApiClient;
  return yield* api.get(`/tasks/${id}`, Task);
});

export const updateTask = Effect.fn('tasks.update')(function* (id: number, patch: TaskPatch) {
  const api = yield* ApiClient;
  return yield* api.patch(`/tasks/${id}`, patch, Task);
});

export const deleteTask = Effect.fn('tasks.delete')(function* (id: number) {
  const api = yield* ApiClient;
  return yield* api.delete(`/tasks/${id}`);
});
