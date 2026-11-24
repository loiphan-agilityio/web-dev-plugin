# Structure: where code goes, and never writing it twice

Applies to every app and package. The folders an app has, and where it keeps code two features
share, are in its `CLAUDE.md` (or a project rule file next to this one); this file holds the rules
that hold whatever the folders are.

## Reuse before writing

Before writing a component, hook, helper, constant, type or test helper:

1. Read the export index of the app or package you are in, and of the packages it depends on, when
   the project keeps one (a `CATALOG.md`); otherwise list the exports of the folders that could
   hold it (`src/components/`, `src/utils/`, `src/hooks/`, `packages/ui/src/`).
2. `git grep` for the behaviour, not only the name (`git grep -n "toLocaleTimeString"`), since the
   same logic can sit under another name.
3. Reuse it, or extend it with a parameter. Do not write a second version next to the first.

An existing export you need is never copied: import it, moving it up a level first if your code
sits outside its reach (placement below).

**Rule of three** for similar logic that is not yet an export (two components each format a
duration inline): the second occurrence may stay inline; the third is not written. Extract one
function to the narrowest place that covers all three and point the other two at it in the same
change.

## Placement: start narrow, move up when a second user appears

Constants, helpers, hooks and components go to the narrowest place that covers every user:

| Used by | Goes to |
|---|---|
| one component | beside it: `constants.ts`, `utils/`, `hooks/`, `components/` in its folder |
| one feature | `src/features/<f>/`: `constants.ts`, `utils/`, `hooks/`, `components/` |
| two or more features | the app's shared folders: `src/components/` for components; hooks, helpers and constants where the app's `CLAUDE.md` or project rules say |
| two or more apps | a package (`packages/ui` for UI primitives); move code into one only when a second app needs it |

When code gains a second user outside its current place, move it up one level in that change and
update the imports; never copy it.

**Types are the exception:** they never move up to a `src/types/` folder.

- A domain shape (request, response, entity) is an Effect Schema in the feature's `schemas.ts` (or
  a shared package once two apps read it); take its type from the schema (`typeof X.Type`), never
  redeclare it.
- Any other type lives in a `types.ts` of the module that owns the concept, and other modules
  import it from there.

No `src/layouts/`, `src/contexts/` or `src/types/`: a layout belongs to the routes that use it, and
a React context lives with its owner (a feature's context, provider and `useX` hook in the
feature; an app-wide provider mounted with the app's providers).

## Top-level folders of an app's `src/`

The list is closed: ask before adding a new top-level folder.

| Folder | Holds |
|---|---|
| `app/` | The composition root: `routes.tsx`, pages, layouts (`RootLayout/`, any `<Name>Layout/`), the providers, the route error screen, and app-wide wiring as flat files (`runtime.ts`, `query-client.ts`, `config.ts`). |
| `api/` | The HTTP layer: `ApiClient`, `ApiError`, `runEffect`, the auth token. |
| `features/` | One folder per feature (below). |
| `components/` | Components with domain meaning that two or more features use (an `OrderSummary`, a `UserAvatar`). A primitive with no domain meaning (button, dialog) goes to `packages/ui`. |
| `constants/` | Values two or more features use, one file per domain (`path.ts`). Values only; no functions. |
| `hooks/` | `use-*.ts` hooks two or more features use. |
| `utils/` | Pure functions two or more features use (`report-error.ts`, `form-errors.ts`). |
| `mocks/` | The MSW wiring: `handlers.ts` (spreads each feature's handlers), `server.ts`, `browser.ts`. |
| `test/` | Test setup, render helpers and environment fakes (see `testing.md`). |
| `styles/` | `index.css`: imports `@repo/ui/globals.css` and adds app-only tokens. |

A layout lives in `src/app/<Name>Layout/` (one only a feature uses lives in that feature); an
app-wide provider is mounted with the app's providers in `src/app/`. An app has only the folders it uses.

### A feature folder

`src/features/<name>/` holds what one feature needs, with only the files it uses: `schemas.ts`
(Effect Schemas only this feature reads), `model.ts` (business rules as pure functions), `api.ts`
(`Effect.fn` calls through `ApiClient`), `queries.ts` (query key factory, `queryOptions`,
mutations), `mocks.ts` (MSW handlers, see `testing.md`), `constants.ts`, `types.ts`,
`components/`, `hooks/`, `utils/`, `__tests__/`.

Another feature is used only through its `schemas`, `model`, `queries` or `routes`; never import
its `api`, `mocks` or `components`. Something two features both need moves up a level.

## Component folders

- **One folder per component**: `ItemForm/index.tsx`, never `item-form.tsx`. `index.tsx` holds the
  component itself, not a re-export; importers keep the folder path (`components/ItemForm`).
  Generated components (the shadcn CLI's files in `packages/ui`) and the app's composition root
  (`src/app/`) keep the layout the app's `CLAUDE.md` or project rules give them.
- Keep files small and single-purpose. A component file past roughly 300 lines, or one that mixes
  state logic, pure helpers and large JSX blocks, is split before the work is done.
- Add only the subfolders it needs, with kebab-case filenames:
  - `components/`: sub-components for one section of the UI (header, summary card, list item).
  - `hooks/`: state and effects for the component (filtering, pagination, timers).
  - `utils/`: pure functions tied to this component's data or DOM ids.
  - `constants.ts` and `types.ts`: values and types used by more than one file in the folder.
- `index.tsx` composes: it calls the hook, computes derived values and renders sub-components. It
  holds no large JSX blocks or helper functions.
- A sub-component that needs a mutation or router hook owns it, instead of receiving it as a prop
  from `index.tsx`. Pass sub-components the minimal props they need, not the whole state object.
- Tests and stories stay at the component's root (`__tests__/`, `<Name>.stories.tsx`).
- Before leaving a helper in a component folder, check whether it is generic (no feature types, no
  feature-specific DOM ids). If so, move it up per the placement table, with a one-line `//`
  comment above the export.
