# Testing

Applies to every app and package. The app's own harness (render helpers, MSW setup, stories,
coverage, the gates to run before calling work done) is in its `CLAUDE.md` (or a project rule file
next to this one).

## What a change must ship with

| The change adds or changes | It ships |
|---|---|
| A pure function (`model.ts`, `utils/`, a schema, a parser) | Unit test of every branch, without rendering |
| A hook with state or effects | Unit test through `renderHook` or the component that owns it |
| A component with logic or render branches (state, conditions, a form, a query) | Unit test in its `__tests__/` + a story per variant |
| A sub-component that only renders props | Covered by the parent's test and story; none of its own |
| An MSW handler or mock state | Used by at least one test |
| A new user flow, page or route | Unit/page test + an end-to-end spec |
| A bug fix | A test that fails before the fix and passes after it |

A test that never fails proves nothing: when you write one for a fix, check it fails against the
old code. Never make a test pass by weakening it (removing an assertion, `.skip`, a looser query):
fix the code.

## How to write a unit test

- Test behaviour through the public surface (what the user sees, what a function returns, what a
  route answers), never internals: no assertions on private state, hook call counts or class names.
- Mock only at the edges: the network through MSW, time through fake timers, the browser APIs
  jsdom lacks through the fakes in `src/test/`. Never `vi.mock` a module (anti-slop rejects it),
  never `vi.stubGlobal('fetch')`, never mock `sonner`.
- Query by role and label, not test ids: one `h1`, headings in order, every link and button named.
- One behaviour per `it`, named as a sentence about it: `it('shows the retry button when the
  request fails')`.

## Where tests live

- In a `__tests__/` folder next to the code they test, never beside the file itself:
  `components/Pricing/index.tsx` → `components/Pricing/__tests__/Pricing.test.tsx`;
  `utils/initials.ts` → `utils/__tests__/initials.test.ts`.
- A second test file for the same source names its topic: `auth-refresh.test.ts`,
  `routes-sign-in-loop.test.tsx`.

## End-to-end

- A new user flow, page or route adds a spec, or extends the spec of the flow it belongs to. Unit
  and page tests cover the branches; e2e covers the flows a user walks end to end. Do not add an
  e2e spec for a state a unit test already proves.
- One flow per `test`, named after what the user does: `test('adds an item from the items
  page')`. Tests do not depend on each other's state or order.
- Query by role and label (`page.getByRole`, `page.getByLabel`); assert with web-first
  `await expect(locator).toBeVisible()`. Never `waitForTimeout`, never a CSS or XPath selector
  for something a user sees.
- A spec never assumes localhost or a port: the same specs run against the deployed site
  (`E2E_BASE_URL`).
- Shared e2e code (constants, screen headings, fake answers, code run in the page) lives in
  `e2e/utils/`; reuse it instead of repeating a heading or a fake answer in a spec, and add to it
  instead of defining one in a spec. When the app keeps its route paths as constants, a spec takes
  them from there instead of writing a path again.
