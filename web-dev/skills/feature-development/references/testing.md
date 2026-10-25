# Testing

Source: the todos feature (`components/TodoList/__tests__/TodoList.test.tsx`, `components/TodoForm/__tests__/TodoForm.test.tsx`, `components/TodosPage/__tests__/TodosPage.test.tsx`, `__tests__/schemas.test.ts`, `mocks.ts`); template `src/test/render.tsx`, `src/test/setup.ts`.

## Harness (already in the template)

`src/test/setup.ts` stubs `matchMedia` (jsdom has none; the Toaster needs it), starts MSW with `onUnhandledFrame: 'error'` (a request with no handler fails the test), clears sonner's toasts before each test and resets handlers after it.

Read the file in the project when a test behaves oddly; do not copy it into a feature.

`src/test/render.tsx` exports `renderRoute(path)` (real route tree) and `renderWithProviders(ui, { path })` (one component). Both create a fresh `QueryClient` (no retries) and router, mount the app's `Toaster`, and return `{ user, queryClient, router, ...rtl }`. Always use that `user`.

## One test file per component

Every component folder has its test file in its own `__tests__/`: `TodoList/index.tsx` → `TodoList/__tests__/TodoList.test.tsx` (a `utils.ts` in the folder → `TodoList/__tests__/utils.test.ts`). Tests never sit next to the file they test; a test in `__tests__/` imports the component from `..`. It renders that component alone with `renderWithProviders(<X />)` and covers the component's own states and interactions. The page test renders the route with `renderRoute('/path')` and checks only what needs the parts together (a created item showing up in the list). Do not repeat a component's cases in the page test.

- A component that owns a query or mutation still goes through `ApiClient` → MSW: drive it with `server.use(...)`, never by mocking hooks or `api.ts`.
- A presentational component (props in, markup out) gets its props from the `mocks.ts` fixtures and callback props as `vi.fn()`; assert the markup and `toHaveBeenCalledWith(...)`.

### The list component

```tsx file=src/features/todos/components/TodoList/__tests__/TodoList.test.tsx
import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTodosHandlers, todoFixtures, todosMocks } from '../../../mocks';
import { TodoList } from '..';

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

```tsx file=src/features/todos/components/TodoForm/__tests__/TodoForm.test.tsx
import { screen, waitFor } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTodosHandlers, todosMocks } from '../../../mocks';
import { TodoForm } from '..';

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

```tsx file=src/features/todos/components/TodosPage/__tests__/TodosPage.test.tsx
import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createTodosHandlers } from '../../../mocks';

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

`components/<Name>List/__tests__/<Name>List.test.tsx`:

- Loading: `server.use(<name>Mocks.listPending())`, `findByRole('status', { name })`.
- Success: `server.use(...create<Name>Handlers(fixtures))`, assert the rows by role.
- Empty: `create<Name>Handlers([])`, assert the text **and** `queryByRole('alert')` is absent.
- Error + retry: `<name>Mocks.listError(500)`, then a second `server.use()` with working handlers, click the retry button, assert recovery.

`components/<Name>Form/__tests__/<Name>Form.test.tsx`:

- Client validation: submit empty, assert the message and `aria-invalid="true"`. One test per field rule the user can trip (required, max length).
- Submit success: type, click, the input is `toHaveValue('')` inside `waitFor`.
- Server 422: `<name>Mocks.createInvalid({ field: 'message' })`, assert the message shows.

`components/<Name>Page/__tests__/<Name>Page.test.tsx`:

- The create flow on the route: the new item appears in the list (proves the mutation invalidates the list query).

Every other component (detail, item row, dialog, edit form): its own folder, with a test file in its `__tests__/` covering its states, each interaction, and each error it shows.

`__tests__/schemas.test.ts`: schema unit tests, below.

`__tests__/model.test.ts`: each rule in `model.ts` and its edges, below.

## server.use ordering

Working handlers plus a failing override in one test: `../../api-integration/references/msw.md`,
Precedence trap.

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

## Model tests

```ts file=src/features/todos/__tests__/model.test.ts
import { openFirst } from '../model';
import type { Todo } from '../schemas';

const todo = (id: number, completed: boolean): Todo => ({ id, title: `Todo ${id}`, completed });

describe('openFirst', () => {
  it('puts open todos first and keeps each group in API order', () => {
    const todos = [todo(1, true), todo(2, false), todo(3, true), todo(4, false)];
    expect(openFirst(todos).map(({ id }) => id)).toEqual([2, 4, 1, 3]);
  });

  it('leaves its input as it was', () => {
    const todos = [todo(1, true), todo(2, false)];
    openFirst(todos);
    expect(todos.map(({ id }) => id)).toEqual([1, 2]);
  });
});
```

A model test calls the function with plain values: no render, no MSW. Cover each rule and its edges.

## Rules

- Query by role and label (`getByRole`, `findByRole`, `getByLabelText`); no test ids. Use `findBy*` for anything after a request.
- Routes are lazy, so after a click on a link the old page stays on screen until the new route loads. Wait for something only the new page has (`await screen.findByRole('heading', { name: 'Edit task' })`) before asserting or typing; otherwise a query can match a field of the old page. The same holds for the header on the first render of `renderRoute`.
- Prefer a native `<select>` (`native-select`) and `user.selectOptions(...)`; the Radix `select` needs browser APIs jsdom lacks (`references/forms.md`, Other controls).
- When a ticket changes a component (a badge becomes a select), update its existing tests and stories in the same change, and say which in the Result.
- Assert behaviour (what the user sees), not implementation (hook calls, cache keys).
- A toast is text on screen: `expect(await screen.findByText('Todo added')).toBeInTheDocument()`. The render helpers mount the `Toaster`; never `vi.mock('sonner')`.
- Don't make a test pass by weakening it: no removing assertions, no `.skip`, no loosening queries. If a test exposes a bug, fix the code.
- Test data for a new feature goes in its `mocks.ts` fixtures, not inline in each test.
- Run one file while iterating: `pnpm test <path> --coverage.enabled=false` (`pnpm test` measures coverage, and one file alone stays under the 80% threshold, so the run fails even when its tests pass), or keep `pnpm test:watch` running in a terminal of its own (it re-runs the tests that import each saved file); run `pnpm check` before finishing.

## End-to-end

One Playwright spec per feature in `e2e/`, named after the feature. It walks the main flow a user takes in a real browser, on the app built with mocks (`pnpm build:mock`): the default handlers from `src/mocks/handlers.ts` serve the feature's fixtures, fresh on every page load.

```ts file=e2e/todos.spec.ts
import { expect, test } from '@playwright/test';

// The mocked API serves the fixtures in src/features/todos/mocks.ts, fresh on every page load.
test('adds a todo from the todos page', async ({ page }) => {
  await page.goto('/todos');
  await expect(page.getByRole('heading', { name: 'Todos' })).toBeVisible();

  const list = page.getByRole('list', { name: 'Todos' });
  await expect(list.getByText('Write the first feature')).toBeVisible();

  await page.getByLabel('Title').fill('Ship the e2e tests');
  await page.getByRole('button', { name: 'Add todo' }).click();

  await expect(list.getByText('Ship the e2e tests')).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('');
});
```

- Open the feature's path (`page.goto('/todos')`): the spec then also proves the lazy route and, on the deploy, the SPA redirect. When `src/app/root-layout.tsx` has a nav, start from `/` and click its link instead, so the spec proves the link too.
- In an app with authentication the route sits inside `protectedRoutes([...])`: sign in first, as `e2e/home.spec.ts` does (`demo@example.com` / `password` on the mocks).
- Assert on fixture values from `mocks.ts`; the same spec runs in CI against the Netlify deploy (`E2E_BASE_URL`), which serves the same mocks.
- Locators by role and label, web-first assertions (`await expect(locator).toBeVisible()`), which wait on their own; never `page.waitForTimeout`.
- One flow per feature. States, error paths and 422s belong to the unit tests above, which are faster and cover them exactly.
- `pnpm test:e2e` runs only the specs; `pnpm check` runs them as its last gate. A missing browser fails with "Executable doesn't exist": run `pnpm test:e2e:install`.
