# library-manager

A proof-of-concept app built by the web-app-skills plugin from **one message**, with no ticket
and no answer to any question:

> Build me a library management app. Librarians manage the book catalogue and the members, lend
> books to members and record returns, and need to see which loans are overdue.

The `build-app` skill wrote the plan in [`docs/plan.md`](docs/plan.md) (data model, API, four
tickets, mock data, and every assumption it made), then scaffolded the app and built each
feature. How the run went is in
[`docs/evidence/one-message/`](../../docs/evidence/one-message/README.md).

- **Loans** (`/loans`, the start page): lend a book to a member, record a return, filter by
  active, overdue and returned, search by book or member.
- **Books** (`/books`): the catalogue with search, an availability filter, add, edit, and delete
  with confirmation; a book with open loans cannot be deleted (409).
- **Members** (`/members`): search, a status filter, add, edit, delete; suspended members cannot
  borrow.
- **Overview** (`/overview`): counts of books, members, active, overdue and due-this-week loans,
  and the overdue loans with a Return button.
- Every data view has loading, error with retry, empty and success states. Every component has a
  test file and a Storybook story.

There is no backend: [MSW](https://mswjs.io/) handlers in `src/features/*/mocks.ts` answer the
API designed in the plan, in tests, in Storybook and in the browser.

## Run it

Needs Node ≥ 22.22 and pnpm 10 or newer (it switches to the pinned pnpm 11 by itself).

```bash
pnpm install
pnpm dev:mock                # http://localhost:5173, API answered by the MSW mocks
pnpm check                   # lint, typecheck, test, build, Storybook build
pnpm storybook               # every component state on http://localhost:6006
```

No line of this folder was written by hand except this README. The copied skills and companions
(`.claude/skills/`, `skills-lock.json`) are left out; install the plugin to get them.
`.claude/settings.json` is the command allow-list the scaffold wrote.
