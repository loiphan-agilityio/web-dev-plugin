# Workflow A: a new app from one description

Turn one description into a running app on mocked data. Every gap gets a sensible default that is written down; nothing stops for a question.

```
description -> docs/plan.md -> project-setup -> feature-development x N (one subagent each, in order) -> [ui-development] -> gates -> run
```

## A0. Where to build

- Tier `new`, `state: empty`: here.
- Tier `new`, `state: other`: a new `<app-name>/` subfolder; the files already here stay as they are.
- Tier `template`: here, without A2.

The app name comes from the description (`library-manager`): lowercase, dashes. A2 creates a monorepo: from then on the **app folder** is its `apps/web`, where A3 and A4 build (read `apps/web/CLAUDE.md`: where its paths differ from the skills' examples, it wins); `docs/plan.md`, A5 and A6 stay at the project root. In a `template` folder the app folder is the folder itself.

When the project is a `<app-name>/` subfolder, this folder has no `package.json` (pnpm fails with "No package.json found"): after A2, run `cd <app-name>` as a command of its own, and have each A3 subagent do the same first. From there the project root is the working folder, and every command of A3 to A5 runs exactly as the skills write it, the same as in a project created here. Only A6's `.claude/launch.json` stays in this folder, so its dev server takes `--dir <app-name>`.

## A1. Plan: `docs/plan.md`

Write the plan in the shape of `plan.md` (beside this file) before any code. It is the contract every later step follows and the user's record of what was decided for them. Done when it has:

- **Product:** one paragraph: who uses the app and for what.
- **Data model:** every entity, every field with its type and rule (required, max length, allowed values). Ids are numbers, dates ISO strings.
- **API:** every endpoint with method, path, body, response and error statuses (404 for an unknown id, 422 for invalid input). REST, JSON, under `VITE_API_URL`.
- **Features:** 2 to 5 tickets in build order, each with a title, a user story and testable acceptance criteria. Together they cover the description, nothing more. A usual shape: a list with filters and a create form, a detail page with edit and delete, a dashboard when the topic has numbers worth showing.
- **Mock data:** 6 to 10 realistic records per entity, covering every allowed value and edge (an overdue item, an empty optional field).
- **Assumptions:** every choice the description left open, one line each.

Gaps get the reading a typical user of that product would expect. Roles, payments, file uploads, real-time updates, email, i18n and SSR are out of scope by default; a description that asks for one gets its UI on a mocked API, noted under Assumptions. Every app has the boilerplate's sign-in feature (A2 creates a web app, which always includes it): the features' pages go inside `protectedRoutes([...])`; roles stay out. A `template` folder, which skips A2, already has it. The app runs on MSW mocks of this API, so keep the API realistic enough for a real backend to replace the mocks without touching the UI.

## A2. Scaffold

Invoke `project-setup` (Skill tool) for the folder from A0, as a web app (`--auth`; it asks nothing then), and follow it through its gates; skip its hand-over. A companion install that fails offline goes under **Not done** and the build continues. A project that could not be created (no network, the boilerplate unreachable) stops the run: report it; never build the app from another template.

## A3. Build each feature

Build the tickets in `docs/plan.md` in order, one at a time, each in its own subagent (Agent tool, `general-purpose`), so this context keeps only the plan and one short report per ticket however many tickets there are. Start the next ticket only after the previous one reports green gates; never run two at once, since they share `src/app/routes.tsx`, `src/mocks/handlers.ts` and the nav.

Give each subagent a self-contained brief, since it does not see this conversation:

- the project folder, its app folder (A0) where the feature goes, `docs/plan.md`, and the ticket's number and title;
- "Invoke the `feature-development` skill (Skill tool) for this ticket and follow it as under `develop`'s Workflow A: the plan answers the ticket's questions; a gap it does not cover gets a default appended to the plan's **Assumptions**, and every criterion stays in scope. Mock handlers serve the plan's mock data. Ignore any design (it is applied later to the whole app). Write no `## Result` block.";
- "Finish with `pnpm lint:fix`, then `pnpm check`, each as a plain command from the project folder (with the project in a subfolder of your starting folder, run `cd <app-name>` first, as a command of its own). Reply in at most 15 lines: files and routes created, the `pnpm check` outcome with test count and coverage, the assumptions you added, and anything not done or any gate you could not run."

Then read the report: a red or missing gate, or a ticket only partly built, is fixed before the next ticket (resume that subagent with SendMessage, or fix it here). Keep its gate line for the final Result. Without an Agent tool, invoke `feature-development` (Skill tool) here for each ticket, under the same rules.

## A4. Design

With a design (images in `design/`, a `DESIGN.md` about the look, or a Figma link in the description), invoke `ui-development` once every feature exists, visual check included when a browser tool is available. Without one, the template's theme stays.

## A5. Gates

`pnpm lint:fix`, then `pnpm check` from the project root (inside `<app-name>/` for a subfolder project, A0), each as a plain command with no pipe or redirect (the skill's `allowed-tools` and the project's allow-list cover exactly those). Fix the cause until all six gates pass; a rule, a type and an assertion stay as strict as they are. A gate that stays red goes in the Result, and the POC is not called done.

## A6. Run it

- With the Claude desktop browser tools (`mcp__Claude_Browser__*`): add a configuration to `.claude/launch.json` (create it if missing, keep other entries): `{ "name": "dev-mock", "runtimeExecutable": "pnpm", "runtimeArgs": ["dev:mock", "--port", "5173", "--strictPort"], "port": 5173 }`, `preview_start` it and open `/`. In the monorepo the runtime args start with `"--filter", "web"`: the root `dev:mock` runs turbo, which rejects Vite's flags. For a subfolder project (A0), `"--dir", "<app-name>"` comes before those: `.claude/launch.json` sits in the session's folder, where pnpm finds no `package.json`. With authentication, `/` sends to the sign-in page: sign in as `demo@example.com` / `password`.
- Otherwise: leave no server running; tell the user to run `pnpm dev:mock` and open the URL Vite prints.
