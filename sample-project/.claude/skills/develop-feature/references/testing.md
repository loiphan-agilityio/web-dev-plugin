# Testing

Source: the todos feature (`components/todos-page.test.tsx`, `schemas.test.ts`, `mocks.ts`); template `src/test/render.tsx`, `src/test/setup.ts`.

## Harness (already in the template)

`src/test/setup.ts` starts MSW with `onUnhandledFrame: 'error'` and resets handlers after each test:

```ts
import '@testing-library/jest-dom/vitest';

import { server } from '@/mocks/server';

// 'error' makes a request with no matching handler fail the test instead of hitting the network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
// Drop per-test overrides added with server.use().
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
```

`src/test/render.tsx` exports `renderRoute(path)` (real route tree) and `renderWithProviders(ui, { path })` (one component). Both create a fresh `QueryClient` (no retries) and router, and return `{ user, queryClient, router, ...rtl }`. Always use that `user`.

## The page test

```tsx
import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createTodosHandlers, todoFixtures, todosMocks } from '../mocks';

describe('TodosPage', () => {
  describe('list', () => {
    it('shows a loading state before the first response', async () => {
      server.use(todosMocks.listPending());
      renderRoute('/todos');
      expect(await screen.findByRole('status', { name: 'Loading todos' })).toBeInTheDocument();
    });

    it('shows the todos', async () => {
      server.use(...createTodosHandlers(todoFixtures));
      renderRoute('/todos');
      const list = await screen.findByRole('list', { name: 'Todos' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(todoFixtures.length);
    });

    it('shows an empty state that is not an error', async () => {
      server.use(...createTodosHandlers([]));
      renderRoute('/todos');
      expect(await screen.findByText(/No todos yet/)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows an error with a retry that recovers', async () => {
      server.use(todosMocks.listError(500));
      const { user } = renderRoute('/todos');
      expect(await screen.findByText('Could not load todos')).toBeInTheDocument();

      server.use(...createTodosHandlers(todoFixtures));
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('list', { name: 'Todos' })).toBeInTheDocument();
    });
  });

  describe('create form', () => {
    it('adds a todo and clears the input', async () => {
      server.use(...createTodosHandlers([]));
      const { user } = renderRoute('/todos');
      await screen.findByText(/No todos yet/);

      await user.type(screen.getByLabelText('Title'), '  Ship it  ');
      await user.click(screen.getByRole('button', { name: 'Add todo' }));

      const list = await screen.findByRole('list', { name: 'Todos' });
      expect(within(list).getByText('Ship it')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });

    it('validates on the client without calling the API', async () => {
      server.use(...createTodosHandlers([]));
      const { user } = renderRoute('/todos');
      await screen.findByText(/No todos yet/);

      await user.click(screen.getByRole('button', { name: 'Add todo' }));

      expect(await screen.findByText('Title is required')).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
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
  });
});
```

## Minimum test set per feature

1. Loading: `server.use(<name>Mocks.listPending())`, `findByRole('status', { name })`.
2. Success: `server.use(...create<Name>Handlers(fixtures))`, assert the rows by role.
3. Empty: `create<Name>Handlers([])`, assert the text **and** `queryByRole('alert')` is absent.
4. Error + retry: `<name>Mocks.listError(500)`, then a second `server.use()` with working handlers, click the retry button, assert recovery.
5. Client validation: submit empty, assert the message and `aria-invalid="true"`; the request never happens (an unhandled request would fail the test anyway).
6. Submit success: type, click, the new item appears, the input is `toHaveValue('')`.
7. Server 422: `<name>Mocks.createInvalid({ field: 'message' })`, assert the message shows.
8. Schema unit tests, below.

## server.use ordering

- A **later** `server.use()` call wins over an earlier one.
- Within **one** call, the **first** matching handler wins.
- So "working handlers, then a failing override" is two calls, later one the override (see the 422 test). The error-then-recover test does the reverse: error first, working handlers second.
- Never put a one-off override and the full handler set in the same call expecting the override to win unless it is listed first.

## Schema tests

```ts
import { Schema } from 'effect';

import { NewTodo } from './schemas';

const decode = Schema.decodeUnknownSync(NewTodo);

describe('NewTodo', () => {
  it('trims the title', () => {
    expect(decode({ title: '  buy milk  ' })).toEqual({ title: 'buy milk' });
  });

  it('rejects a blank title', () => {
    expect(() => decode({ title: '   ' })).toThrow('Title is required');
  });
});
```

`Schema.decodeUnknownSync` throws on failure; assert on the message text the user would see. Cover trimming/transform, each `check`, and one valid case.

## Rules

- Query by role and label (`getByRole`, `findByRole`, `getByLabelText`); no test ids. Use `findBy*` for anything after a request.
- Assert behaviour (what the user sees), not implementation (hook calls, cache keys).
- Vitest 5 globals (`describe`, `it`, `expect`) are on; `clearMocks` is default true; `vi.mock` only at file top level. There is no Jest; do not use `jest.*`.
- MSW 3 imports: `msw/http`, `msw/utils/delay`. Root `msw` imports of `http`/`HttpResponse`/`delay` are rejected by lint.
- Don't make a test pass by weakening it: no removing assertions, no `.skip`, no loosening queries. If a test exposes a bug, fix the code.
- Test data for a new feature goes in its `mocks.ts` fixtures, not inline in each test.
- Run one file while iterating: `pnpm test <path>`; run `pnpm check` before finishing.
