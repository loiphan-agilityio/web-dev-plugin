# Feature layout

One folder per feature: `src/features/<name>/`. All code below is the todos feature (`src/features/todos/`), verified in a project from the boilerplate (`apps/web`).

## Files and names

| File | Contains | Names (todos) |
|---|---|---|
| `schemas.ts` | Effect Schemas + derived types | `Todo`, `TodoList`, `NewTodo`, `NewTodoInput` |
| `model.ts` | business rules as pure functions of the schema types | `openFirst` |
| `api.ts` | `Effect.fn` calls on `ApiClient` | `listTodos`, `createTodo` |
| `queries.ts` | key factory, `queryOptions`, mutation hooks | `todoKeys`, `todoListQueryOptions`, `useCreateTodo` |
| `mocks.ts` | MSW handlers | `createTodosHandlers`, `todosHandlers`, `todosMocks`, `todoFixtures` |
| `routes.tsx` | lazy route factory | `todoRoutes` |
| `components/` | one folder per component, named like its export (below) | `TodoForm/index.tsx` -> `TodoForm` |

## components/

One folder per component, named in PascalCase like the component it exports:

```
components/
  TodoForm/
    index.tsx                     the component itself: export const TodoForm
    TodoForm.stories.tsx          its stories (stories.md)
    __tests__/TodoForm.test.tsx   its tests (testing.md)
    types.ts, utils.ts, ...       only what TodoForm alone uses: props types, helpers, constants
```

- `index.tsx` holds the component, not a re-export. Import the folder: `import { TodoForm } from '../TodoForm'`.
- A file in the folder serves that component only. When a second component needs it, it leaves the folder: a business rule goes to `model.ts`, markup becomes its own component folder.
- `src/components/` (shared app components) uses the same layout. `packages/ui/src/components/` keeps the flat kebab-case files the shadcn CLI writes; `src/app/` keeps its kebab-case files.

Import from `@/...` for anything outside the feature, relative paths inside it.

## schemas.ts

The full file is in the api-integration skill, `references/effect-http.md`, section "Schema
(`features/<name>/schemas.ts`)" (`../../api-integration/references/effect-http.md`). Name the value and
the type the same, and derive types (`typeof X.Type`), never hand-write them. When a schema
transforms (`Schema.Trim`), export both sides: `Type` (`NewTodo`) is what the API gets,
`Encoded` (`NewTodoInput`) is what the form holds, and `useForm` takes both. Validation messages
go through `Schema.check(Schema.isMinLength(1, { message }))`; they are what the user sees under
the field.

## model.ts

Business rules live here as pure functions of the schema types: what sorts first, a total, what
counts as overdue. Components and queries call them instead of computing a rule inline, and
`__tests__/model.test.ts` tests them without rendering (`testing.md`, Model tests). A rule that
needs today's date takes it as a parameter (`isOverdue(task, today)`), so it stays pure.

```ts file=src/features/todos/model.ts
import type { Todo } from './schemas';

/** Open todos first; each group keeps the order the API sent. */
export const openFirst = (todos: readonly Todo[]) =>
  todos.toSorted((a, b) => Number(a.completed) - Number(b.completed));
```

## api.ts

The full file is in the api-integration skill, `references/effect-http.md`, section "Effect.fn
(`features/<name>/api.ts`)" (installed next to this skill: `../../api-integration/references/effect-http.md`).
It is kept in one place for both skills. Shape: one `Effect.fn('<name>.<action>')` per call that
does `const api = yield* ApiClient` and returns `api.get(path, Schema)` or `api.post(path, input, Schema)`.

## queries.ts

The full file is in the api-integration skill, `references/react-query.md`, sections "Keys and query
options" and "Mutation hook" (`../../api-integration/references/react-query.md`). Shape: a key factory
(`todoKeys`), a `queryOptions` factory per read (`todoListQueryOptions`) whose `queryFn` passes
`signal` to `runEffect`, and a `use<Action><Name>` hook per write that returns the
`invalidateQueries` promise from `onSuccess`.

## mocks.ts

The full file is in the api-integration skill, `references/msw.md`, section "Feature mocks
(`features/<name>/mocks.ts`)" (`../../api-integration/references/msw.md`). Shape: `create<Name>Handlers(initial)`
with in-memory state per call, `<name>Handlers` for the default list, and `<name>Mocks` for one-off states
(pending with `delay('infinite')`, error status, 422 with field errors).

## routes.tsx

```tsx file=src/features/todos/routes.tsx
import type { RouteObject } from 'react-router';

/**
 * Lazy, so the feature is split into its own chunk and loaded on first visit. A function so
 * each router gets fresh route objects (see src/app/routes.tsx).
 */
export const todoRoutes = (): RouteObject[] => [
  {
    path: 'todos',
    lazy: {
      Component: async () => (await import('./components/TodosPage')).TodosPage,
    },
  },
];
```

Factory, because React Router 8 empties a lazy route object once loaded. A module-level array would work for the first router and break the next one.

## Wiring (two edits outside the folder)

The todos wiring diff, on a web app from the boilerplate (every one has authentication): the route goes inside `protectedRoutes([...])`, next to the home page; a public page goes next to `...authRoutes()` instead, and the feature's handlers after `createAuthHandlers()`. The boilerplate's `src/app/root-layout.tsx` has no nav; when the app has one, add a `<Link to="/todos">` there too.

```diff file=wiring.diff
diff --git a/src/app/routes.tsx b/src/app/routes.tsx
index d8d9753..6af9058 100644
--- a/src/app/routes.tsx
+++ b/src/app/routes.tsx
@@ -2,4 +2,5 @@ import type { RouteObject } from 'react-router';
 
 import { authRoutes, protectedRoutes } from '@/features/auth/routes';
+import { todoRoutes } from '@/features/todos/routes';
 
 import { HomePage } from './home-page';
@@ -19,5 +20,8 @@ export const createRoutes = (): RouteObject[] => [
     Component: RootLayout,
     ErrorBoundary: RouteError,
-    children: [...authRoutes(), protectedRoutes([{ index: true, Component: HomePage }])],
+    children: [
+      ...authRoutes(),
+      protectedRoutes([{ index: true, Component: HomePage }, ...todoRoutes()]),
+    ],
   },
 ];
diff --git a/src/mocks/handlers.ts b/src/mocks/handlers.ts
index 98b02fa..24e4d3c 100644
--- a/src/mocks/handlers.ts
+++ b/src/mocks/handlers.ts
@@ -2,4 +2,5 @@ import type { RequestHandler } from 'msw';
 
 import { createAuthHandlers } from '@/features/auth/mocks';
+import { todosHandlers } from '@/features/todos/mocks';
 
 /**
@@ -7,3 +8,3 @@ import { createAuthHandlers } from '@/features/auth/mocks';
  * Storybook). Each feature exports its own from `src/features/<name>/mocks.ts`; spread them here.
  */
-export const handlers: RequestHandler[] = [...createAuthHandlers()];
+export const handlers: RequestHandler[] = [...createAuthHandlers(), ...todosHandlers];
```

Forgetting the handlers line is the usual failure: `pnpm dev:mock` returns unhandled requests. Forgetting the route gives a 404 in `renderRoute`.
