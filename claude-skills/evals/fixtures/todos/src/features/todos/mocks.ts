import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';

import type { Todo } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

export const todoFixtures: Todo[] = [
  { id: 1, title: 'Read the Effect AGENTS.md', completed: true },
  { id: 2, title: 'Write the first feature', completed: false },
];

/**
 * A small in-memory backend. Each call gets its own copy of the data, so tests that call
 * `server.use(...createTodosHandlers())` never see state left over from another test.
 */
export const createTodosHandlers = (initial: Todo[] = todoFixtures) => {
  const todos = [...initial];
  return [
    http.get(url('/todos'), () => HttpResponse.json(todos)),
    http.post(url('/todos'), async ({ request }) => {
      const body = (await request.json()) as { title: string };
      const todo: Todo = { id: todos.length + 1, title: body.title, completed: false };
      todos.push(todo);
      return HttpResponse.json(todo, { status: 201 });
    }),
  ];
};

/** Default handlers, registered in src/mocks/handlers.ts. */
export const todosHandlers = createTodosHandlers();

/** One-off responses for the states a test needs to drive. */
export const todosMocks = {
  listPending: () =>
    http.get(url('/todos'), async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    }),
  listError: (status = 500) =>
    http.get(url('/todos'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  createInvalid: (errors: Record<string, string>) =>
    http.post(url('/todos'), () =>
      HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 }),
    ),
};
