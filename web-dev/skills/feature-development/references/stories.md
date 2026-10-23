# Stories

Source: the todos feature (`components/TodoList/TodoList.stories.tsx`, `components/TodoForm/TodoForm.stories.tsx`, `components/TodosPage/TodosPage.stories.tsx`); template `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/story-providers.tsx`.

Storybook 10 (`@storybook/react-vite`) shows every component in each state it can render, so a reviewer can see the screen without running the app. `pnpm storybook` opens it on port 6006; `pnpm build-storybook` is part of `pnpm check`, so a story that does not compile fails the gates.

## Harness (already in the template)

Every story renders inside the same providers as a test: a fresh `QueryClient` with no retries, a `MemoryRouter` (so `Link` works) and the `Toaster`. MSW runs in every story through the app's browser worker (`src/mocks/browser.ts`), so the default handlers from `src/mocks/handlers.ts` apply and a story overrides them with `parameters.msw.handlers`.

The worker is started once in `.storybook/preview.tsx` (`beforeEach`, `onUnhandledFrame: 'bypass'`), each story's handlers are added with `worker.use(...)`, and they are reset after it.

There is no `msw-storybook-addon`: it calls MSW 2's `onUnhandledRequest`, and the app's own worker does the job. Do not install it, and do not add providers or a router inside a story.

## One story file per component

Every component folder has a `<Name>.stories.tsx` beside its `index.tsx` (`TodoList/index.tsx` → `TodoList/TodoList.stories.tsx`), which imports the component from `.`; its test is `TodoList/__tests__/TodoList.test.tsx`. The stories show the states; the tests prove them. Drive each state with the feature's `mocks.ts` (the same `create<Name>Handlers` and `<name>Mocks` the tests use), never with new inline data or by mocking hooks.

### The list component

One story per state: the four states of a data screen are four stories.

```tsx file=src/features/todos/components/TodoList/TodoList.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTodosHandlers, todoFixtures, todosMocks } from '../../mocks';
import { TodoList } from '.';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Todos/TodoList',
  component: TodoList,
} satisfies Meta<typeof TodoList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [todosMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createTodosHandlers(todoFixtures) } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: createTodosHandlers([]) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [todosMocks.listError(500)] } },
};
```

### The form component

A state the form reaches only by interaction (a server field error, client validation) gets a `play` function. `canvas` and `userEvent` come from the story context; nothing is imported for them.

```tsx file=src/features/todos/components/TodoForm/TodoForm.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTodosHandlers, todosMocks } from '../../mocks';
import { TodoForm } from '.';

const meta = {
  title: 'Todos/TodoForm',
  component: TodoForm,
  parameters: { msw: { handlers: createTodosHandlers([]) } },
} satisfies Meta<typeof TodoForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` submits the form, so the story opens on it. */
export const ServerFieldError: Story = {
  parameters: { msw: { handlers: [todosMocks.createInvalid({ title: 'Already exists' })] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Duplicate');
    await userEvent.click(canvas.getByRole('button', { name: 'Add todo' }));
  },
};
```

### The page

One `Default` story with working handlers: the parts together. The states are already in the component stories.

```tsx file=src/features/todos/components/TodosPage/TodosPage.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTodosHandlers } from '../../mocks';
import { TodosPage } from '.';

// TodoList and TodoForm have their own stories per state; this shows the parts together.
const meta = {
  title: 'Todos/TodosPage',
  component: TodosPage,
  parameters: { msw: { handlers: createTodosHandlers() } },
} satisfies Meta<typeof TodosPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

## Rules

- `title` is `<Feature>/<Component>` (`Todos/TodoList`), so the sidebar groups by feature.
- `const meta = { ... } satisfies Meta<typeof X>` and `type Story = StoryObj<typeof meta>`: types come from `@storybook/react-vite`. Not `@storybook/react`, not `@storybook/test` (Storybook 10 moved it into `storybook/test`, and `play` gets `canvas` / `userEvent` from its context).
- Minimum set: list = `Loading`, `Success`, `Empty`, `ErrorState`; form = `Default` plus one `play` story per server error the form shows; page = `Default`. Any other component (item row, dialog, edit form): a story per state it renders.
- Do not name a story `Error`: it shadows the global `Error` in that module. Use `ErrorState`.
- Handlers set on `meta.parameters` apply to every story in the file; a story's own `parameters.msw.handlers` replaces them.
- Stories are not tests: the `.test.tsx` in each component folder's `__tests__/` still covers every state and error path. Do not delete or thin a test because a story shows the same state.
