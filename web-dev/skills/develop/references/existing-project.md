# Workflow B: an existing project

The project's architecture and conventions win over the template's. Change only what the request needs. Paths are relative to the `develop` skill's directory.

## B1. One change (feature, api, ui)

1. **Map.** Launch the `codebase-explorer` agent (Agent tool; `web-dev:codebase-explorer` when installed as a plugin) with the request and the detect JSON; without an Agent tool, follow `../../../agents/codebase-explorer.md` directly. Done when its **project map** is in hand: the file for each role (HTTP client, query layer, forms, validation, routing, UI kit, shared components, test helpers, mocks), the conventions and the gate commands.
2. **Reuse.** Name the existing file or component each part of the request builds on. A missing role gets the smallest addition that fits the project, never the template's whole layer.
3. **Plan.** List the files to change and to create, and nothing else: no refactor, rename, reformat or upgrade outside the request.
4. **Implement.** Invoke the skill for the kind (`feature-development`, `api-integration` or `ui-development`; Skill tool) with the project map. Its `references/outside-template.md` says which of its rules hold here.
5. **Regression checks.** Run the regression-gates command from `develop`'s `SKILL.md`, exactly as written there: the project's own `check` when it has one (the checklist then has one Check row and says to read the script for what it covers), else lint, typecheck, test and build, over the whole suite; it ends with a checklist in aligned columns (each gate's mark, the unit tests' pass rate, the gates the project has no script for) that goes in the Result as printed, in a code block so the columns stay aligned. Fix what the change broke. A failure in code the change does not touch is reported: call it pre-existing only after showing it fails without the change, else call it unproven. Exit 2 means nothing was verified (no gate script, no `package.json`, or a failed detection; stderr says which): report it under **Not done**, never as passed.

## B2. A whole app in an existing project

The request describes a product and the folder holds a React project on its own stack: build the product inside that project, on its stack.

1. **Map** as in B1.
2. **Plan** as in `new-app.md`, A1, with the API following the conventions the map found (base URL, error shape, naming). Write `docs/plan.md`, or `docs/plan-<app-name>.md` when `docs/plan.md` exists.
3. **Build** each ticket through B1, steps 2 to 5, in order. `develop`'s ask rules hold: the code at stake is the user's, so a library the project lacks is a question.

When the request asks for a separate app ("a new app", "a separate project"), run Workflow A in a new `<app-name>/` subfolder instead and say so in the Route line.

## B3. A setup request in a folder with files

`project-setup` only creates a project in a folder without the boilerplate's files (`create-project.sh` refuses any that exist):

- **`template`:** already set up; scaffold nothing. A request for one piece the template ships (the companion skills, the git hooks) gets that piece, as `project-setup` steps 5 and 6 describe it; then `pnpm check`.
- **`same-stack`, `other-stack`:** adding the template's stack or tooling to an existing project is not in this version. Change nothing; offer a new project from the boilerplate in a `<app-name>/` subfolder.
- **`new`, `state: other`:** `project-setup` in a new `<app-name>/` subfolder; its Result, with the **Route:** line on top, is the report.
