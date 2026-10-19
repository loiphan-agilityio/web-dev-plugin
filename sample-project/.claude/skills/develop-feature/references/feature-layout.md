# Feature layout

One folder per feature: `src/features/<name>/`. All code below is the todos feature (`src/features/todos/`), verified on a fresh scaffold.

## Files and names

| File | Contains | Names (todos) |
|---|---|---|
| `schemas.ts` | Effect Schemas + derived types | `Todo`, `TodoList`, `NewTodo`, `NewTodoInput` |
| `api.ts` | `Effect.fn` calls on `ApiClient` | `listTodos`, `createTodo` |
| `queries.ts` | key factory, `queryOptions`, mutation hooks | `todoKeys`, `todoListQueryOptions`, `useCreateTodo` |
| `mocks.ts` | MSW handlers | `createTodosHandlers`, `todosHandlers`, `todosMocks`, `todoFixtures` |
| `routes.tsx` | lazy route factory | `todoRoutes` |
| `components/` | kebab-case files, PascalCase named exports, tests beside them | `todo-form.tsx` -> `TodoForm` |

Import from `@/...` for anything outside the feature, relative paths inside it. Use inline type imports (`import { type NewTodo, Todo } from './schemas'`); lint enforces it.

## schemas.ts

Name the value and the type the same. Derive, never hand-write, types. When a schema transforms (`Schema.Trim`), export both sides: `Type` is what the API gets, `Encoded` is what the form holds.

```ts
import { Schema } from 'effect';

/** A todo as the API returns it. */
export const Todo = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
});
export type Todo = typeof Todo.Type;

export const TodoList = Schema.Array(Todo);

/**
 * What the create form collects and the API accepts. `Schema.Trim` decodes "  milk " to
 * "milk", so the form's input type (`NewTodoInput`, the schema's Encoded side) and its
 * submitted type (`NewTodo`, the Type side) differ — useForm takes both.
 */
export const NewTodo = Schema.Struct({
  title: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Title is required' }),
      Schema.isMaxLength(100, { message: 'Keep the title under 100 characters' }),
    ),
  ),
});
export type NewTodo = typeof NewTodo.Type;
export type NewTodoInput = typeof NewTodo.Encoded;
```

Validation messages go through `Schema.check(Schema.isMinLength(1, { message }))`; they are what the user sees under the field.

## api.ts

```ts
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
```

`ApiClient` prefixes `config.apiUrl`, decodes the body with the schema you pass, and maps every failure to an `ApiError`. No `fetch`, no axios, no `HttpClient.retryTransient`. Methods used in the example: `api.get(path, schema)` and `api.post(path, body, schema)`; read `src/lib/api/client.ts` for the rest (put, patch, delete) before using them.

## queries.ts

```ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { runEffect } from '@/lib/api/run';

import { createTodo, listTodos } from './api';
import type { NewTodo } from './schemas';

/** Every todo query key comes from here, so invalidation can target exactly what changed. */
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
};

export const todoListQueryOptions = () =>
  queryOptions({
    queryKey: todoKeys.lists(),
    queryFn: ({ signal }) => runEffect(listTodos(), signal),
  });

export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTodo) => runEffect(createTodo(input)),
    // Returning the promise keeps the mutation pending until the list has refetched.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todoKeys.lists() }),
  });
};
```

- Keys come only from the factory. A new query adds keys next to `lists`, e.g. `details: () => [...todoKeys.all, 'detail'] as const` and `detail: (id: number) => [...todoKeys.details(), id] as const`.
- `runEffect` rejects with the typed `ApiError`; `query.error._tag` is safe to switch on.
- Returning the promise from `onSuccess` keeps the mutation `isPending` until the refetch ends, so the UI never shows a stale list under a re-enabled button.
- Retries: queries once (network/server errors only), mutations never. Configured in `src/lib/query-client.ts`; do not add more.

## mocks.ts

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

- `create<Name>Handlers(initial)` copies its input, so each call has private state.
- `<name>Handlers` (default data) is registered globally; tests override with `server.use(...)`.
- `<name>Mocks.*` are one-off responses: pending, error, 422. The 422 body shape (`{ message, errors: { field: message } }`) is what `ValidationError.fields` is built from; confirm it against `src/lib/api/client.ts` and the real API.

## routes.tsx

```tsx
import type { RouteObject } from 'react-router';

/**
 * Lazy, so the feature is split into its own chunk and loaded on first visit. A function so
 * each router gets fresh route objects (see src/app/routes.tsx).
 */
export const todoRoutes = (): RouteObject[] => [
  {
    path: 'todos',
    lazy: {
      Component: async () => (await import('./components/todos-page')).TodosPage,
    },
  },
];
```

Factory, because React Router 8 empties a lazy route object once loaded. A module-level array would work for the first router and break the next one.

## Wiring (three edits outside the folder)

The todos wiring diff:

```diff
diff --git a/src/app/root-layout.tsx b/src/app/root-layout.tsx
index d3c2306..cddbea5 100644
--- a/src/app/root-layout.tsx
+++ b/src/app/root-layout.tsx
@@ -10,2 +10,5 @@ export function RootLayout() {
           </Link>
+          <Link to="/todos" className="text-sm text-muted-foreground hover:text-foreground">
+            Todos
+          </Link>
         </nav>
diff --git a/src/app/routes.tsx b/src/app/routes.tsx
index e5ca784..716fb95 100644
--- a/src/app/routes.tsx
+++ b/src/app/routes.tsx
@@ -2,2 +2,4 @@ import type { RouteObject } from 'react-router';
 
+import { todoRoutes } from '@/features/todos/routes';
+
 import { HomePage } from './home-page';
@@ -17,3 +19,3 @@ export const createRoutes = (): RouteObject[] => [
     ErrorBoundary: RouteError,
-    children: [{ index: true, Component: HomePage }],
+    children: [{ index: true, Component: HomePage }, ...todoRoutes()],
   },
diff --git a/src/mocks/handlers.ts b/src/mocks/handlers.ts
index 21d1365..894508f 100644
--- a/src/mocks/handlers.ts
+++ b/src/mocks/handlers.ts
@@ -2,2 +2,4 @@ import type { RequestHandler } from 'msw';
 
+import { todosHandlers } from '@/features/todos/mocks';
+
 /**
@@ -6,2 +8,2 @@ import type { RequestHandler } from 'msw';
  */
-export const handlers: RequestHandler[] = [];
+export const handlers: RequestHandler[] = [...todosHandlers];
```

Forgetting the handlers line is the usual failure: `pnpm dev` with `VITE_API_MOCKING=true` returns unhandled requests. Forgetting the route gives a 404 in `renderRoute`.

## Reuse checklist before creating anything

1. `src/features/*/` — another feature may already own the schema or query you need; import its `queries.ts`, don't duplicate the call.
2. `src/components/` — shared app components.
3. `src/components/ui/` — installed shadcn components. Missing one: `pnpm dlx shadcn@latest add <name>`; never hand-edit this folder (it is generated and lint-ignored).
