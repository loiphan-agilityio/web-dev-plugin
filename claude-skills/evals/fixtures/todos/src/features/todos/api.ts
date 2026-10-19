import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { type NewTodo, Todo, TodoList } from './schemas';

export const listTodos = Effect.fn('todos.list')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/todos', TodoList);
});

export const createTodo = Effect.fn('todos.create')(function* (input: NewTodo) {
  const api = yield* ApiClient;
  return yield* api.post('/todos', input, Todo);
});
