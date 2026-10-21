# UI states

Source: the todos feature (`components/todo-list.tsx` and `todos-page.tsx`).

Four states are four different screens. Never fold them into one ternary, and never let empty and error look the same.

```tsx file=src/features/todos/components/todo-list.tsx
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { LoadingState } from '@/components/loading-state';

import { todoListQueryOptions } from '../queries';

/** Loading, error, empty and success are four different screens — never one ternary. */
export const TodoList = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(todoListQueryOptions());

  // isPending is true only before the first result, so a background refetch keeps the list.
  if (isPending) {
    return <LoadingState label="Loading todos" />;
  }

  if (isError) {
    return (
      <ErrorAlert
        title="Could not load todos"
        error={error}
        onRetry={() => void refetch()}
        retrying={isRefetching}
      />
    );
  }

  if (data.length === 0) {
    return <EmptyState message="No todos yet. Add the first one above." />;
  }

  return (
    <ul aria-label="Todos" className="divide-y rounded-lg border">
      {data.map(({ id, title, completed }) => (
        <li key={id} className="flex items-center justify-between px-4 py-3">
          <span className={completed ? 'text-muted-foreground line-through' : undefined}>
            {title}
          </span>
        </li>
      ))}
    </ul>
  );
};
```

## State by state

Three of the four states, and the page title, are shared components in `src/components/`. Use
them instead of writing the markup again; each already has the accessibility the state needs.

| State | Condition | Render |
|---|---|---|
| Loading | `isPending` | `<LoadingState label="Loading <things>" />` (`role="status"`, skeleton rows; `rows` to match the content) |
| Error | `isError` | `<ErrorAlert title="Could not load <things>" error={error} onRetry={() => void refetch()} retrying={isRefetching} />` (shows `toUserMessage(error)`, never the raw message) |
| Empty | success, no rows | `<EmptyState message="<what to do next>" action={...} />` (plain text, never an alert) |
| Success | data present | the feature's own list or table, with an accessible name (`aria-label="Todos"`) |

Page title: `<PageHeader title="..." description="..." actions={...} />` renders the page's one `h1`.
A look these components do not cover (a skeleton shaped like cards) is written in the feature;
when a second feature needs the same markup, move it to `src/components/` with a test and a story.

- Use **`isPending`**, not `isLoading`. `isPending` is true only before the first result, so a background refetch keeps showing data.
- Order matters: pending, error, empty, success. TypeScript narrows `data` after the first two returns.
- `isRefetching`, passed as `retrying`, disables the retry button while the retry runs.
- `error` is already typed as `ApiError` (registered in `src/lib/query-client.ts`); switch on `error._tag` if one error needs special UI (e.g. `NotFoundError` on a detail page).

## Page composition

```tsx file=src/features/todos/components/todos-page.tsx
import { PageHeader } from '@/components/page-header';

import { TodoForm } from './todo-form';
import { TodoList } from './todo-list';

export const TodosPage = () => (
  <section className="space-y-6">
    <PageHeader title="Todos" />
    <TodoForm />
    <TodoList />
  </section>
);
```

The page only composes; each child owns its own query/mutation. Both use the same `todoListQueryOptions()`, so the cache is shared.

## Styling and a11y rules

- Tokens, not raw colors: `text-muted-foreground`, `bg-background`, `border`. No `tailwind.config.js` exists (Tailwind 4, tokens in `src/styles/index.css`).
- `cn` from `@/lib/utils` for conditional classes; do not import `clsx` or `tailwind-merge` (lint rejects them).
- `type="button"` on every non-submit `Button`, otherwise it submits an enclosing form.
- Icon-only buttons need `aria-label`.
- Lists use `ul`/`li`; headings keep order (`h1` in the page, `h2` below).
- Lint runs `jsx-a11y`; fix findings, don't disable them.
- Reuse in this order: `src/components/` (shared app components), then shadcn components in `src/components/ui/` (`Button`, `Field`, `Card`...), composed instead of restyled. Components in `src/components/ui` are never edited.

## Lazy loading

Routes are already split by the `lazy` route factory. For a heavy component inside a page use `React.lazy`, not `next/dynamic`.
