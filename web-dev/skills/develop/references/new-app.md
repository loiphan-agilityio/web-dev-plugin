# Workflow A: a new app from one description

Turn one description into a running app on mocked data. Every gap gets a sensible default that is written down; nothing stops for a question.

```
description -> docs/plan.md -> project-setup -> feature-development x N -> [ui-development] -> gates -> run
```

## A0. Where to build

- Tier `new`, `state: empty`: here.
- Tier `new`, `state: other`: a new `<app-name>/` subfolder; the files already here stay as they are.
- Tier `template`: here, without A2.

The app name comes from the description (`library-manager`): lowercase, dashes.

## A1. Plan: `docs/plan.md`

Write the plan in the shape of `plan.md` (beside this file) before any code. It is the contract every later step follows and the user's record of what was decided for them. Done when it has:

- **Product:** one paragraph: who uses the app and for what.
- **Data model:** every entity, every field with its type and rule (required, max length, allowed values). Ids are numbers, dates ISO strings.
- **API:** every endpoint with method, path, body, response and error statuses (404 for an unknown id, 422 for invalid input). REST, JSON, under `VITE_API_URL`.
- **Features:** 2 to 5 tickets in build order, each with a title, a user story and testable acceptance criteria. Together they cover the description, nothing more. A usual shape: a list with filters and a create form, a detail page with edit and delete, a dashboard when the topic has numbers worth showing.
- **Mock data:** 6 to 10 realistic records per entity, covering every allowed value and edge (an overdue item, an empty optional field).
- **Assumptions:** every choice the description left open, one line each.

Gaps get the reading a typical user of that product would expect. Sign-in and roles, payments, file uploads, real-time updates, email, i18n and SSR are out of scope by default; a description that asks for one gets its UI on a mocked API, noted under Assumptions. The app runs on MSW mocks of this API, so keep the API realistic enough for a real backend to replace the mocks without touching the UI.

## A2. Scaffold

Invoke `project-setup` (Skill tool) for the folder from A0 and follow it through its gates; skip its hand-over. A companion install that fails offline goes under **Not done** and the build continues.

## A3. Build each feature

For each ticket in `docs/plan.md`, in order, invoke `feature-development` (Skill tool) with it and reach green gates before the next ticket. Meanwhile:

- the plan answers the ticket's questions; a gap it does not cover gets a default added to its **Assumptions**, and every criterion stays in scope;
- mock handlers serve the plan's mock data;
- a design waits for A4, which applies it once to the whole app;
- keep one line of gate output per feature for the final Result instead of a Result per feature.

## A4. Design

With a design (images in `design/`, a `DESIGN.md` about the look, or a Figma link in the description), invoke `ui-development` once every feature exists, visual check included when a browser tool is available. Without one, the template's theme stays.

## A5. Gates

`pnpm lint:fix`, then `pnpm check`, each as a plain command with no pipe or redirect (the project's allow-list covers exactly those). Fix the cause until all five gates pass; a rule, a type and an assertion stay as strict as they are. A gate that stays red goes in the Result, and the POC is not called done.

## A6. Run it

- With the Claude desktop browser tools (`mcp__Claude_Browser__*`): add a configuration to `.claude/launch.json` (create it if missing, keep other entries): `{ "name": "dev-mock", "runtimeExecutable": "pnpm", "runtimeArgs": ["dev:mock", "--port", "5173", "--strictPort"], "port": 5173 }`, `preview_start` it and open `/`.
- Otherwise: leave no server running; tell the user to run `pnpm dev:mock` and open the URL Vite prints.
