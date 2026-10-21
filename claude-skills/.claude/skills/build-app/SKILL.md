---
name: build-app
description: Builds a whole working web app (React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query, React Hook Form, shadcn/ui) from one description, end to end and without stopping for questions - plans the features, scaffolds, builds every feature with its API layer and mocks, runs every gate and leaves a POC that runs with a mocked backend. Use when the request describes an app or product to build, on any topic - "build me a library management app", "make an app where a team can track expenses", "create a POC / prototype / MVP of a booking site", "I need a CRM with contacts and deals". Not for scaffolding an empty project with no features (code-skeleton), one feature or ticket in an existing app (develop-feature), one endpoint (integrate-api), or restyling to match a design (design-to-ui).
---

# build-app

Turn one description into a running app. The user asked once and expects a finished POC, so this skill **does not stop to ask**: every gap gets a sensible default that is written down, and the final report lists them. It plans, then drives the other four skills, which do the work:

```
description -> docs/plan.md -> code-skeleton -> develop-feature x N (integrate-api inside) -> [design-to-ui] -> gates -> run
```

## 0. Where to build

- An empty folder, or one holding only `.git/`, `.claude/`, a `design/` folder or a `DESIGN.md`: build there.
- A folder that already holds the app (a `package.json` naming this stack): skip step 2 and add the features to it.
- Any other non-empty folder: create `<app-name>/` inside it and build there. Never move or delete the user's files.

The app name comes from the description (`library-manager`), lowercase with dashes.

## 1. Plan: write `docs/plan.md`

Read `references/plan.md` and write the plan in that shape before any code. It is the contract every later step follows, and the user's record of what was decided for them.

- **Product:** one paragraph: who uses the app and for what.
- **Data model:** each entity with every field, its type and its rule (required, max length, allowed values). Ids are numbers, dates ISO strings.
- **API:** every endpoint, method, path, body and response, and its error statuses (404 for an unknown id, 422 for invalid input). REST, JSON, under `VITE_API_URL`.
- **Features:** 2 to 5 tickets, in build order, each in the ticket format of the reference: a title, a user story, and acceptance criteria concrete enough to test. Together they cover the description, nothing more. A usual shape: a list page with filters and a create form, a detail page with edit and delete, and a dashboard or summary when the topic has numbers worth showing.
- **Mock data:** 6 to 10 realistic records per entity, covering every allowed value and edge (an overdue item, an empty optional field).
- **Assumptions:** every choice the description left open, one line each.

Fill gaps instead of asking:

- Pick the simplest reading that a typical user of that product would expect, and write it under **Assumptions**.
- **Out of scope by default:** sign-in and roles, payments, file uploads, real-time updates, email, i18n, SSR. If the description asks for one, plan the UI with a mocked API and say so under Assumptions.
- No backend exists: the app runs on MSW mocks of the API you designed. Keep the API realistic, so a real backend can replace the mocks without touching the UI.
- A design in `design/` (PNG, screenshot), a `DESIGN.md`, or a Figma link in the description is used in step 4. All are optional: without them the app keeps the template's theme.

## 2. Scaffold

Invoke the `code-skeleton` skill (Skill tool) for the folder from step 0, and follow it to the end of its gates. Skip its hand-over: this skill reports at the end. A companion install that fails offline is noted and does not stop the build.

## 3. Build each feature

For each ticket in `docs/plan.md`, in order, invoke the `develop-feature` skill (Skill tool) with that ticket, and follow it to green gates before the next ticket. It invokes `integrate-api` for every endpoint beyond one list and one create.

While this skill leads:

- The plan already answers the ticket's open questions. A gap the plan does not cover gets a default, added to **Assumptions** in `docs/plan.md`; do not exclude the criterion and do not stop.
- Mock handlers serve the plan's mock data, so the running app shows it.
- Do not write a Result block per feature; keep a short note of each feature's gate output for the final report.

## 4. Design (only with a design)

When `design/` holds images, the project has a `DESIGN.md` that describes the look, or the description links a Figma file, invoke the `design-to-ui` skill once all features exist, and follow it, including its visual check when a browser is available. Without a design, the shadcn theme stays as scaffolded.

## 5. Gates

Run `pnpm lint:fix`, then `pnpm check`, each as a plain command with no pipe or redirect (the project allows exactly those commands without a prompt). Read the real output and fix the cause until all five gates pass. Never disable a rule, loosen a type or delete an assertion to get green. If a gate still fails, say which and why in the report; do not claim the POC is done.

## 6. Run it

The POC must be usable right away, with no backend:

- **The Claude desktop app** (`mcp__Claude_Browser__*` tools with `preview_start`): add a `dev-mock` entry to `.claude/launch.json` (`pnpm dev:mock --port 5173 --strictPort`, as in the `design-to-ui` skill's `references/visual-check.md`, section 3A), `preview_start` it and open `/`. The user sees the app in the browser pane.
- **Otherwise:** do not leave a server running. Tell the user to run `pnpm dev:mock` and open the URL Vite prints.

## Result

End with one block for the whole run:

```
## Result
**Did:** the app (folder, name), its features with their routes, and the gate outcome (tests, coverage)
**Run it:** `pnpm dev:mock` (mocked API) or how it is already open; `pnpm dev` with `VITE_API_URL` for a real backend
**Assumptions:** every choice made for the user, from docs/plan.md
**Not done:** anything planned but not built, a failing gate, a skipped visual check
**Next:** what to confirm or build next
```

## Related skills

- `code-skeleton`, `develop-feature`, `integrate-api`, `design-to-ui`: the four project skills this one drives. Their rules apply inside each step; where they say to ask the user, this skill's rule wins: decide, record it under Assumptions, and keep going.
