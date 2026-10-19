# MSW 3 handlers and tests

## Imports (lint enforces the root-`msw` ban on these names)

```ts
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';        // also bypass, passthrough: msw/utils/<name>
import { setupServer } from 'msw/node';         // src/mocks/server.ts
import { setupWorker } from 'msw/browser';      // src/mocks/browser.ts
import type { RequestHandler } from 'msw';      // types may still come from the root
```

`onUnhandledRequest` was renamed `onUnhandledFrame`. The test server (`src/test/setup.ts`) calls `server.listen({ onUnhandledFrame: 'error' })`: a request with no handler fails the test. `afterEach` runs `server.resetHandlers()`, which drops every `server.use()` override.

## Feature mocks (`features/<name>/mocks.ts`)

```ts
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
```

Conventions:

- URLs are built from `config.apiUrl`, so they match exactly what `ApiClient` requests.
- `create<Name>Handlers(initial)` returns fresh state per call; `<name>Mocks` holds one-off states (pending, errors by status, 422). Add one entry per error the endpoint can produce.
- Network failure: `http.get(url('/todos'), () => HttpResponse.error())` (standard MSW; not in the todos example). It surfaces as `NetworkError`.
- Mock bodies must satisfy the response schema, otherwise tests get `InvalidResponseError`. Reuse the schema types for fixtures.
- Keep error bodies in the shape `ValidationBody` reads: `{ message, errors: { field: 'text' } }`.
- Infinite loading state: `await delay('infinite')` inside the handler.

## Registering (`src/mocks/handlers.ts`)

Currently `export const handlers: RequestHandler[] = [];`. Add each feature's default handlers:

```ts
import { todosHandlers } from '@/features/todos/mocks';

export const handlers: RequestHandler[] = [...todosHandlers];
```

(This is the `src/mocks/handlers.ts` hunk of the wiring diff in develop-feature's `references/feature-layout.md`.) The same list feeds the Vitest server and the browser worker (`VITE_API_MOCKING=true pnpm dev`, started in `src/main.tsx`). Default handlers keep unrelated tests from failing on unhandled requests.

## Overriding in tests

```ts
import { screen } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';
import { createTodosHandlers, todoFixtures, todosMocks } from '../mocks';

it('shows a loading state before the first response', async () => {
  server.use(todosMocks.listPending());
  renderRoute('/todos');
  expect(await screen.findByRole('status', { name: 'Loading todos' })).toBeInTheDocument();
});

it('shows an error with a retry that recovers', async () => {
  server.use(todosMocks.listError(500));
  const { user } = renderRoute('/todos');
  expect(await screen.findByText('Could not load todos')).toBeInTheDocument();

  server.use(...createTodosHandlers(todoFixtures));
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('list', { name: 'Todos' })).toBeInTheDocument();
});

it('shows server field errors under the input', async () => {
  server.use(...createTodosHandlers([]));
  // A later server.use() call takes precedence over earlier ones.
  server.use(todosMocks.createInvalid({ title: 'Already exists' }));
  const { user } = renderRoute('/todos');
  await screen.findByText(/No todos yet/);

  await user.type(screen.getByLabelText('Title'), 'Duplicate');
  await user.click(screen.getByRole('button', { name: 'Add todo' }));

  expect(await screen.findByText('Already exists')).toBeInTheDocument();
});
```

### Precedence trap

A later `server.use()` call wins; **within one call the first matching handler wins**. This silently uses the success handler and the 422 never happens:

```ts
// don't
server.use(...createTodosHandlers([]), todosMocks.createInvalid({ title: 'x' }));
// do: two calls
server.use(...createTodosHandlers([]));
server.use(todosMocks.createInvalid({ title: 'x' }));
```

### Other rules

- Never `vi.stubGlobal('fetch')` or `vi.mock` an `api.ts`; the real `ApiClient` -> MSW path is what the tests cover.
- Do not import `http` / `HttpResponse` / `delay` from the root `msw` (lint error); many snippets online and in companion skills do.
- A test that needs the request body or params asserts on the handler side (read `request.json()` in the handler and respond accordingly) or on the resulting UI.
- Test names describe behaviour ("shows an empty state that is not an error"); query by role/label, not test ids.
