# Coding standards

How code reads in a project this plugin writes. ESLint enforces it in a project from the
boilerplate. In any other project, the project's own lint config and the code around the change
win: match them, and do not reformat code the task does not touch.

The boilerplate's `apps/web/CLAUDE.md` carries the section below, word for word, so a project
from it has the section without the plugin. `tools/check-guidelines.mjs` (in the repository, not shipped with the plugin) fails when the
two differ.

## Code style

Lint enforces it, and `func-style` has no autofix, so write it this way from the start:

- Arrow functions only: `export const ItemList = () => { ... };`, `export const useX = () => ...`.
  `function*` stays only inside `Effect.gen` / `Effect.fn`. A component that only returns markup
  returns it directly: `export const Page = () => (<section>...</section>);`.
- Destructure objects (`const { title } = item`, props, callback arguments), use shorthand
  properties, template literals instead of `+`, `??` / `?.`, `const` (never `var`), `===`.
- A handler that returns nothing gets braces: `onClick={() => { setOpen(true); }}`, not
  `onClick={() => setOpen(true)}` (`no-confusing-void-expression`).
- Inline type imports (`import { type Item, NewItem } from './schemas'`); `pnpm lint:fix`
  fixes most of the rest and formats.
- anti-slop (part of `pnpm lint` here and at the root; `pnpm lint:slop` at the root runs it
  alone) rejects low-evidence code: a type assertion
  without a `// SAFETY:` comment on the invariant, `as unknown as`, `unknown` or `object` in a
  function's parameters or return type (parse at the boundary instead; a catch argument is named
  `cause`), `typeof` narrowing outside a parser, `vi.mock` of a module, comparing or building
  `_tag` by hand (use `instanceof` the error class, `Match`, or the class constructor). It also
  wants a blank line before a `return` and around multi-line statements: `pnpm lint:fix` adds them.
