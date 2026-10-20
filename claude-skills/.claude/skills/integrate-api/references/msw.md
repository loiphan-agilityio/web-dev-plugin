# MSW 3 handlers and tests

Code blocks are copied from the template or the verified todos feature; blocks marked `sketch` show patterns that are in neither.

## Imports (lint enforces the root-`msw` ban on these names)

```ts sketch
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';        // also bypass, passthrough: msw/utils/<name>
import { setupServer } from 'msw/node';         // src/mocks/server.ts
import { setupWorker } from 'msw/browser';      // src/mocks/browser.ts
import type { RequestHandler } from 'msw';      // types may still come from the root
```

`onUnhandledRequest` was renamed `onUnhandledFrame`. The test server (`src/test/setup.ts`) calls `server.listen({ onUnhandledFrame: 'error' })`: a request with no handler fails the test. `afterEach` runs `server.resetHandlers()`, which drops every `server.use()` override.

## Feature mocks (`features/<name>/mocks.ts`)

```ts file=src/features/todos/mocks.ts
import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';

import type { NewTodo, Todo } from './schemas';

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
    // The type arguments are path params and request body: `request.json()` is typed, no cast.
    http.post<never, NewTodo>(url('/todos'), async ({ request }) => {
      const { title } = await request.json();
      const todo: Todo = { id: todos.length + 1, title, completed: false };
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
- **A fixed path goes before a path with a parameter.** In `create<Name>Handlers`, put `http.get(url('/tasks/stats'), ...)` above `http.get(url('/tasks/:id'), ...)`: the first matching handler wins, and `:id` matches `stats`, so the stats request would get a task (or a 404) and fail to decode. The same holds across features in `src/mocks/handlers.ts`.

## Registering (`src/mocks/handlers.ts`)

Currently `export const handlers: RequestHandler[] = [];`. Add each feature's default handlers:

```ts sketch
import { todosHandlers } from '@/features/todos/mocks';

export const handlers: RequestHandler[] = [...todosHandlers];
```

(This is the `src/mocks/handlers.ts` hunk of the wiring diff in develop-feature's `references/feature-layout.md`.) The same list feeds the Vitest server and the browser worker (`pnpm dev:mock`, started in `src/main.tsx`). Default handlers keep unrelated tests from failing on unhandled requests.

## Overriding in tests

`server.use(...)` changes what the backend answers for one test; `afterEach` drops it again. The
todos tests show both uses, in the develop-feature skill's `references/testing.md`
(`../../develop-feature/references/testing.md`):

- "The list component", test `shows an error with a retry that recovers`: `server.use(todosMocks.listError(500))`
  first, then `server.use(...createTodosHandlers(todoFixtures))` for the retry.
- "The page test": invalidation proved through the UI. The in-memory handlers start empty, the
  create goes through them, and the new item shows only because the list refetched.

### Precedence trap

A later `server.use()` call wins; **within one call the first matching handler wins**. A component that loads data and also runs the mutation that should fail (a list whose rows toggle or delete, an edit form that loads its item) needs both in its own test: the working handlers, then the failing one in a later call. In one call the success handler matches first and the error never happens:

```ts sketch
// don't
server.use(...createTodosHandlers([]), todosMocks.createInvalid({ title: 'x' }));
// do: two calls
server.use(...createTodosHandlers([]));
server.use(todosMocks.createInvalid({ title: 'x' }));
```

### Toasts

A toast is asserted as text (`findByText`): the render helpers mount the `Toaster`. Never mock
`sonner`. Details, and what to add in a project scaffolded before the template did this:
`../../develop-feature/references/testing.md`, section Rules.

### Other rules

- Never `vi.stubGlobal('fetch')` or `vi.mock` an `api.ts`; the real `ApiClient` -> MSW path is what the tests cover.
- Do not import `http` / `HttpResponse` / `delay` from the root `msw` (lint error); many snippets online and in companion skills do.
- A test that needs the request body or params asserts on the handler side (read `request.json()` in the handler and respond accordingly) or on the resulting UI.
- Test names describe behaviour ("shows an empty state that is not an error"); query by role/label, not test ids.
