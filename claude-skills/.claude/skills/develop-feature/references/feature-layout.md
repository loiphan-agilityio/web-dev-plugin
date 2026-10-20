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
| `components/` | kebab-case files, PascalCase named exports, a `.stories.tsx` beside each one and a `.test.tsx` for each one in `components/__tests__/` | `todo-form.tsx` -> `TodoForm` |

Import from `@/...` for anything outside the feature, relative paths inside it. Use inline type imports (`import { type NewTodo, Todo } from './schemas'`); lint enforces it.

## schemas.ts

The full file is in the integrate-api skill, `references/effect-http.md`, section "Schema
(`features/<name>/schemas.ts`)" (`../integrate-api/references/effect-http.md`). Name the value and
the type the same, and derive types (`typeof X.Type`), never hand-write them. When a schema
transforms (`Schema.Trim`), export both sides: `Type` (`NewTodo`) is what the API gets,
`Encoded` (`NewTodoInput`) is what the form holds, and `useForm` takes both. Validation messages
go through `Schema.check(Schema.isMinLength(1, { message }))`; they are what the user sees under
the field.

## api.ts

The full file is in the integrate-api skill, `references/effect-http.md`, section "Effect.fn
(`features/<name>/api.ts`)" (installed next to this skill: `../integrate-api/references/effect-http.md`).
It is kept in one place for both skills. Shape: one `Effect.fn('<name>.<action>')` per call that
does `const api = yield* ApiClient` and returns `api.get(path, Schema)` or `api.post(path, input, Schema)`.

`ApiClient` prefixes `config.apiUrl`, decodes the body with the schema you pass, and maps every failure to an `ApiError`. No `fetch`, no axios, no `HttpClient.retryTransient`. Methods used in the example: `api.get(path, schema)` and `api.post(path, body, schema)`; read `src/lib/api/client.ts` for the rest (put, patch, delete) before using them.

## queries.ts

The full file is in the integrate-api skill, `references/react-query.md`, sections "Keys and query
options" and "Mutation hook" (`../integrate-api/references/react-query.md`). Shape: a key factory
(`todoKeys`), a `queryOptions` factory per read (`todoListQueryOptions`) whose `queryFn` passes
`signal` to `runEffect`, and a `use<Action><Name>` hook per write that returns the
`invalidateQueries` promise from `onSuccess`.

## mocks.ts

The full file is in the integrate-api skill, `references/msw.md`, section "Feature mocks
(`features/<name>/mocks.ts`)" (`../integrate-api/references/msw.md`). Shape: `create<Name>Handlers(initial)`
with in-memory state per call, `<name>Handlers` for the default list, and `<name>Mocks` for one-off states
(pending with `delay('infinite')`, error status, 422 with field errors).

- `create<Name>Handlers(initial)` copies its input, so each call has private state.
- `<name>Handlers` (default data) is registered globally; tests override with `server.use(...)`.
- `<name>Mocks.*` are one-off responses: pending, error, 422. The 422 body shape (`{ message, errors: { field: message } }`) is what `ValidationError.fields` is built from; confirm it against `src/lib/api/client.ts` and the real API.

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
      Component: async () => (await import('./components/todos-page')).TodosPage,
    },
  },
];
```

Factory, because React Router 8 empties a lazy route object once loaded. A module-level array would work for the first router and break the next one.

## Wiring (three edits outside the folder)

The todos wiring diff:

```diff file=wiring.diff
diff --git a/src/app/root-layout.tsx b/src/app/root-layout.tsx
index 548b02a..3d7e1e1 100644
--- a/src/app/root-layout.tsx
+++ b/src/app/root-layout.tsx
@@ -9,2 +9,5 @@ export const RootLayout = () => (
         </Link>
+        <Link to="/todos" className="text-sm text-muted-foreground hover:text-foreground">
+          Todos
+        </Link>
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
index 69fcd8a..d83556e 100644
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

Forgetting the handlers line is the usual failure: `pnpm dev:mock` returns unhandled requests. Forgetting the route gives a 404 in `renderRoute`.

## Reuse checklist before creating anything

1. `src/features/*/` — another feature may already own the schema or query you need; import its `queries.ts`, don't duplicate the call.
2. `src/components/` — shared app components.
3. `src/components/ui/` — installed shadcn components. Missing one: `pnpm exec shadcn add <name>`; never hand-edit this folder (it is generated and lint-ignored).
