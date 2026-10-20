# Spec: Claude Code skills for web development

Ticket: [granbull/space#5127](https://gitlab.asoft-python.com/granbull/space/-/work_items/5127),
"Space - Create Claude Skills for Web Development".

## Intent

Give Claude a set of skills so that, asked to build part of a web app on the team stack, it
follows the team's conventions on the first try: the same folder layout, the same API layer,
the same error handling and the same tests, with library APIs that match the installed versions
rather than the older ones in its training data.

## Stack

React 19 · Vite 8 · TypeScript 6 · Effect 4 · TanStack Query 5 · React Hook Form 7 ·
shadcn/ui (Tailwind CSS 4) · React Router 8 · Vitest 5 + React Testing Library + MSW 3 ·
Storybook 10 · pnpm 11. The ticket names the first seven; the rest were chosen to complete the
stack and are pinned in the template.

## Scope

| # | Ticket requirement | Delivered by | Done when |
|---|---|---|---|
| 1 | **Code skeleton:** scaffold a working project (providers, Effect runtime, query client, path alias, lint, tests) | `code-skeleton` skill + `template/` (56 files) + `scaffold.sh` | A fresh scaffold passes lint, typecheck, test, build and Storybook build (`verify.sh`, also run by CI) |
| 2 | **Develop feature:** ticket → tested UI (schema, API layer, queries/mutations, form, UI, tests) | `develop-feature` skill + a worked todos feature in its `references/` | The worked feature passes every gate on a fresh scaffold, with a test file and a story file per component |
| 3 | **Integrate API:** Effect Schema + HttpClient with typed errors, `queryOptions` / mutations, MSW mocks | `integrate-api` skill + `ApiClient`, `runEffect`, `ApiError` in the template | Every backend failure maps to one of 7 typed `ApiError` cases, tested in `client.test.ts` |
| + | Not in the ticket: build a UI that matches a design (screenshot, mockup, Figma) | `design-to-ui` skill | Theme tokens, shadcn components and the four data states, no raw colors |

### Each skill must

- Trigger from the words a developer would type ("Scaffold a new web app", "Implement this
  ticket", "Add PATCH /todos/:id", "Make it look like this screenshot"), and not trigger on
  requests that belong to another skill.
- Copy every code example from the verified template or the worked feature, never from memory.
- Run `pnpm check` (all five gates) before reporting done.
- End with a `## Result` block: Did / Saw / Not done / Blocked by / Next.
- Exclude an acceptance criterion that depends on an unanswered question, and name it in the
  report instead of guessing.

### The generated app must

- Call the backend only through `ApiClient` (lint rejects `fetch` and `axios`).
- Render four distinct states on every data screen: loading, error with retry, empty, success.
- Show server validation errors (422) next to the matching form fields.
- Mock every request with MSW in tests; an unhandled request fails the test.
- Keep at least 80% line coverage in `src/features/**` and `src/lib/**`.

## Out of scope

- SSR and Next.js, backend code, CI/CD pipelines for the generated apps (from the ticket).
- End-to-end browser tests (Playwright): the template has unit and component tests only.
- Applying the skeleton to an existing project: `scaffold.sh` refuses a folder with
  conflicting files.

## Distribution

The skills ship as the Claude Code plugin `web-app-skills`, listed by the marketplace at the
repository root, from the branch `web-development-skills`. Install steps are in
[`claude-skills/README.md`](claude-skills/README.md#install). Eight third-party companion
skills (shadcn, React Router, Vite, Vitest, React performance, composition, React Hook Form,
React Testing) are installed next to them, pinned to audited commits.

## Evidence

See [`docs/evidence/README.md`](docs/evidence/README.md).
