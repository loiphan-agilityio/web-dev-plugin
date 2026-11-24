# Code style

Applies to every app and package. Lint enforces most of it (`func-style` has no autofix), so write
it this way from the start; `pnpm lint:fix` fixes and formats the rest. A project's own
`CLAUDE.md` or `.claude/rules/` may add to this file; it does not repeat it.

## Functions and handlers

- Arrow functions only: `export const Pricing = () => { ... };`, `export const useX = () => ...`.
  `function*` stays only inside `Effect.gen` / `Effect.fn`. A component that only returns markup
  returns it directly: `export const Page = () => (<section>...</section>);`.
- An event prop (`onClick`, `onPick`, `onCloseAutoFocus`...) takes a named handler, not an inline
  arrow: `const handleClick = () => { setOpen(true); };` declared in the component body before
  `return`, then `onClick={handleClick}`. Name it `handle` + the event (`handleClick`,
  `handlePick`), adding the target when one component has two of the same event
  (`handleMoreClick`). A function that already does the job is passed as is, without a wrapper
  (`onOpenChange={setIsOpen}`, `onClick={toggle}`), and so is a value given through context
  (`close`). Inside `.map`, a handler that needs the item may stay inline. A handler that returns
  nothing gets braces (`no-confusing-void-expression`): `const handleRetry = () => { void
  refetch(); };`.

## Expressions

- Destructure objects (`const { title } = item`, props, callback arguments), use shorthand
  properties, template literals instead of `+`, `??` / `?.`, `const` (never `var`), `===`.
- Check presence by truthiness, not by comparing to `undefined`: `{MoreItem && <MoreItem />}`,
  `if (!Component) return [];`, `description ? id : undefined`, `!items.length`. Compare
  explicitly only where a falsy value is a real value: a number that can be `0` (never put one left
  of `&&` in JSX: it renders `0`), a boolean whose `false` differs from missing, or a string whose
  `''` must not count as missing.

## Types and anti-slop

- Inline type imports: `import { type Plan, plans } from './plans'`.
- anti-slop (part of `pnpm lint`) rejects low-evidence code: a type assertion without a
  `// SAFETY:` comment on the invariant, `as unknown as`, `unknown` or `object` in a function's
  parameters or return type (parse at the boundary; a catch argument is named `cause`), `typeof`
  narrowing outside a parser, `vi.mock` of a module, comparing or building `_tag` by hand (use
  `instanceof` the error class, `Match`, or the class constructor). It also wants a blank line
  before a `return` and around multi-line statements: `pnpm lint:fix` adds them.

## Naming

| What | Form | Example |
|---|---|---|
| Component folder | PascalCase, named like the export | `ItemForm/index.tsx` |
| Any other file | kebab-case | `format-started-ago.ts`, `query-client.ts` |
| Hook | `use-*.ts`, export `useX` | `use-copy-link.ts` → `useCopyLink` |
| Boolean | `is` / `has` / `should` / `can` prefix | `isOpen`, `hasItems` |
| Event handler | `handle` + event (+ target) | `handleClick`, `handleMoreClick` |
| Module constant | `SCREAMING_SNAKE_CASE` | `RECONNECT_TIMEOUT_MS` |

A unit belongs in a constant's name when the value has one (`_MS`, `_PX`).

## Imports (convention, not lint: oxlint has no `import/order`)

External packages (`@repo/*` counts as external) → `@/` aliases → relative, one blank line between
groups, alphabetical by path inside each group.

## Comments

- Put a one-line `//` comment above an export whose name does not say what it does.
- Comment the why the code cannot show, never what the next line does.
