# Coding standards

How code reads in a project this plugin writes. ESLint enforces it in a project scaffolded from
the template. In any other project, the project's own lint config and the code around the change
win: match them, and do not reformat code the task does not touch.

A project scaffolded from the template carries the section below, word for word, in its own
`CLAUDE.md`. `tools/check-guidelines.mjs` (in the repository, not shipped with the plugin) fails when the
two differ.

## Code style

Lint enforces it, and `func-style` has no autofix, so write it this way from the start:

- Arrow functions only: `export const TodoList = () => { ... };`, `export const useX = () => ...`.
  `function*` stays only inside `Effect.gen` / `Effect.fn`. A component that only returns markup
  returns it directly: `export const Page = () => (<section>...</section>);`.
- Destructure objects (`const { title } = todo`, props, callback arguments), use shorthand
  properties, template literals instead of `+`, `??` / `?.`, `const` (never `var`), `===`.
- A handler that returns nothing gets braces: `onClick={() => { setOpen(true); }}`, not
  `onClick={() => setOpen(true)}` (`no-confusing-void-expression`).
- Inline type imports (`import { type Todo, NewTodo } from './schemas'`); `pnpm lint:fix`
  fixes most of the rest and formats.
