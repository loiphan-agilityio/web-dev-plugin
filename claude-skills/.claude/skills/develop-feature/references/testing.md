# Testing

Source: the todos feature (`components/__tests__/todo-list.test.tsx`, `components/__tests__/todo-form.test.tsx`, `components/__tests__/todos-page.test.tsx`, `__tests__/schemas.test.ts`, `mocks.ts`); template `src/test/render.tsx`, `src/test/setup.ts`.

## Harness (already in the template)

`src/test/setup.ts` stubs `matchMedia` (jsdom has none; the Toaster needs it), starts MSW with `onUnhandledFrame: 'error'`, clears sonner's toasts before each test and resets handlers after it.

Read the file in the project when a test behaves oddly; do not copy it into a feature.

`src/test/render.tsx` exports `renderRoute(path)` (real route tree) and `renderWithProviders(ui, { path })` (one component). Both create a fresh `QueryClient` (no retries) and router, mount the app's `Toaster`, and return `{ user, queryClient, router, ...rtl }`. Always use that `user`.

## One test file per component

Every file in `components/` has a test file in `components/__tests__/`: `todo-list.tsx` → `__tests__/todo-list.test.tsx`. Tests never sit next to the file they test; a test in `__tests__/` imports it from `../`. It renders that component alone with `renderWithProviders(<X />)` and covers the component's own states and interactions. The page test renders the route with `renderRoute('/path')` and checks only what needs the parts together (a created item showing up in the list). Do not repeat a component's cases in the page test.

- A component that owns a query or mutation still goes through `ApiClient` → MSW: drive it with `server.use(...)`, never by mocking hooks or `api.ts`.
- A presentational component (props in, markup out) gets its props from the `mocks.ts` fixtures and callback props as `vi.fn()`; assert the markup and `toHaveBeenCalledWith(...)`.

### The list component

```tsx file=src/features/todos/components/__tests__/todo-list.test.tsx
import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTodosHandlers, todoFixtures, todosMocks } from '../../mocks';
import { TodoList } from '../todo-list';

describe('TodoList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(todosMocks.listPending());
    renderWithProviders(<TodoList />);
    expect(await screen.findByRole('status', { name: 'Loading todos' })).toBeInTheDocument();
  });

  it('shows the todos', async () => {
    server.use(...createTodosHandlers(todoFixtures));
    renderWithProviders(<TodoList />);
    const list = await screen.findByRole('list', { name: 'Todos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(todoFixtures.length);
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createTodosHandlers([]));
    renderWithProviders(<TodoList />);
    expect(await screen.findByText(/No todos yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(todosMocks.listError(500));
    const { user } = renderWithProviders(<TodoList />);
    expect(await screen.findByText('Could not load todos')).toBeInTheDocument();

    server.use(...createTodosHandlers(todoFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Todos' })).toBeInTheDocument();
  });
});
```

### The form component

```tsx file=src/features/todos/components/__tests__/todo-form.test.tsx
import { screen, waitFor } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTodosHandlers, todosMocks } from '../../mocks';
import { TodoForm } from '../todo-form';

describe('TodoForm', () => {
  it('validates on the client', async () => {
    const { user } = renderWithProviders(<TodoForm />);

    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the input after a successful submit', async () => {
    server.use(...createTodosHandlers([]));
    const { user } = renderWithProviders(<TodoForm />);

    await user.type(screen.getByLabelText('Title'), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
  });

  it('shows server field errors under the input', async () => {
    server.use(todosMocks.createInvalid({ title: 'Already exists' }));
    const { user } = renderWithProviders(<TodoForm />);

    await user.type(screen.getByLabelText('Title'), 'Duplicate');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(await screen.findByText('Already exists')).toBeInTheDocument();
  });
});
```

The form alone makes no `GET`, so the 422 override is one `server.use()` call. The reset is awaited with `waitFor`: the input stays in the DOM, so there is no `findBy*` to wait on.

### The page test

```tsx file=src/features/todos/components/__tests__/todos-page.test.tsx
import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createTodosHandlers } from '../../mocks';

// TodoList and TodoForm test their own states; this checks they work together on the route.
describe('TodosPage', () => {
  it('shows a new todo in the list after it is created', async () => {
    server.use(...createTodosHandlers([]));
    const { user } = renderRoute('/todos');
    await screen.findByText(/No todos yet/);

    await user.type(screen.getByLabelText('Title'), '  Ship it  ');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    const list = await screen.findByRole('list', { name: 'Todos' });
    expect(within(list).getByText('Ship it')).toBeInTheDocument();
  });
});
```

## Minimum test set per feature

`components/__tests__/<name>-list.test.tsx`:

- Loading: `server.use(<name>Mocks.listPending())`, `findByRole('status', { name })`.
- Success: `server.use(...create<Name>Handlers(fixtures))`, assert the rows by role.
- Empty: `create<Name>Handlers([])`, assert the text **and** `queryByRole('alert')` is absent.
- Error + retry: `<name>Mocks.listError(500)`, then a second `server.use()` with working handlers, click the retry button, assert recovery.

`components/__tests__/<name>-form.test.tsx`:

- Client validation: submit empty, assert the message and `aria-invalid="true"`. One test per field rule the user can trip (required, max length).
- Submit success: type, click, the input is `toHaveValue('')` inside `waitFor`.
- Server 422: `<name>Mocks.createInvalid({ field: 'message' })`, assert the message shows.

`components/__tests__/<name>-page.test.tsx`:

- The create flow on the route: the new item appears in the list (proves the mutation invalidates the list query).

Every other component (detail, item row, dialog, edit form): its own test file in `components/__tests__/` with its states, each interaction, and each error it shows.

`__tests__/schemas.test.ts`: schema unit tests, below.

## server.use ordering

- A **later** `server.use()` call wins over an earlier one.
- Within **one** call, the **first** matching handler wins.
- So "working handlers, then a failing override" is two calls, later one the override: a page test whose list must load while the create fails needs `server.use(...create<Name>Handlers([]))` then `server.use(<name>Mocks.createInvalid(...))`. The error-then-recover list test does the reverse: error first, working handlers second.
- Never put a one-off override and the full handler set in the same call expecting the override to win unless it is listed first.

## Schema tests

```ts file=src/features/todos/__tests__/schemas.test.ts
import { Schema } from 'effect';

import { NewTodo } from '../schemas';

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
- Routes are lazy, so after a click on a link the old page stays on screen until the new route loads. Wait for something only the new page has (`await screen.findByRole('heading', { name: 'Edit task' })`) before asserting or typing; otherwise a query can match a field of the old page. The same holds for the header on the first render of `renderRoute`.
- Prefer a native `<select>` (`native-select`) and `user.selectOptions(...)`; the Radix `select` needs browser APIs jsdom lacks (`references/forms.md`, Other controls).
- When a ticket changes a component (a badge becomes a select), update its existing tests and stories in the same change, and say which in the Result.
- Assert behaviour (what the user sees), not implementation (hook calls, cache keys).
- A toast is text on screen: `expect(await screen.findByText('Todo added')).toBeInTheDocument()`. The render helpers mount the `Toaster`; never `vi.mock('sonner')`. In a project scaffolded before the template did this, add the `<Toaster />` to `src/test/render.tsx`, and the `matchMedia` stub and `toast.dismiss()` to `src/test/setup.ts`, as in `.claude/skills/code-skeleton/template/src/test/`.
- Vitest 5 globals (`describe`, `it`, `expect`) are on; `clearMocks` is default true; `vi.mock` only at file top level. There is no Jest; do not use `jest.*`.
- MSW 3 imports: `msw/http`, `msw/utils/delay`. Root `msw` imports of `http`/`HttpResponse`/`delay` are rejected by lint.
- Don't make a test pass by weakening it: no removing assertions, no `.skip`, no loosening queries. If a test exposes a bug, fix the code.
- Test data for a new feature goes in its `mocks.ts` fixtures, not inline in each test.
- Run one file while iterating: `pnpm test <path>`; run `pnpm check` before finishing.
