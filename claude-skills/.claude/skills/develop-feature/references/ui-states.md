# UI states

Source: the todos feature (`components/todo-list.tsx` and `todos-page.tsx`).

Four states are four different screens. Never fold them into one ternary, and never let empty and error look the same.

```tsx
import { useQuery } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toUserMessage } from '@/lib/api/errors';

import { todoListQueryOptions } from '../queries';

/** Loading, error, empty and success are four different screens — never one ternary. */
export const TodoList = () => {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useQuery(todoListQueryOptions());

  // isPending is true only before the first result, so a background refetch keeps the list.
  if (isPending) {
    return (
      <div role="status" aria-label="Loading todos" className="space-y-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load todos</AlertTitle>
        <AlertDescription>
          <p>{toUserMessage(error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={isRefetching}
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground">No todos yet. Add the first one above.</p>;
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

| State | Condition | Must have |
|---|---|---|
| Loading | `isPending` | `role="status"` + `aria-label` naming what loads; `Skeleton` shaped like the content |
| Error | `isError` | `toUserMessage(error)` (never `error.message` raw), a "Try again" button calling `refetch()`, `type="button"` |
| Empty | success, no rows | plain text that says the next action; **no** `role="alert"` or destructive styling |
| Success | data present | semantic list/table with an accessible name (`aria-label="Todos"`) |

- Use **`isPending`**, not `isLoading`. `isPending` is true only before the first result, so a background refetch keeps showing data.
- Order matters: pending, error, empty, success. TypeScript narrows `data` after the first two returns.
- `isRefetching` disables the retry button while the retry runs.
- `error` is already typed as `ApiError` (registered in `src/lib/query-client.ts`); switch on `error._tag` if one error needs special UI (e.g. `NotFoundError` on a detail page).

## Page composition

```tsx
import { TodoForm } from './todo-form';
import { TodoList } from './todo-list';

export const TodosPage = () => (
  <section className="space-y-6">
    <h1 className="font-heading text-2xl font-semibold">Todos</h1>
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
- Compose shadcn components (`Alert`, `Skeleton`, `Button`, `Field`) instead of restyling; the `shadcn` companion covers composition. Components in `src/components/ui` are never edited.

## Lazy loading

Routes are already split by the `lazy` route factory. For a heavy component inside a page use `React.lazy`, not `next/dynamic`.
