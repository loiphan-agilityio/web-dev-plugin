---
name: develop
description: This skill should be used when the user types "/web-dev:develop", describes a whole web app, POC, MVP or landing page to build ("build an employee management app with CRUD and search"), or asks for a feature, endpoint or screen in an existing React project that is not built on the web-dev stack (axios, zod, Redux). It detects the project, picks the workflow and runs the other web-dev skills. Not for non-React projects, Next.js or SSR, bug fixes, code review or PR/MR work.
compatibility: "Claude Code, as part of the web-dev plugin only: reads the plugin's scripts/, references/ and agents/ beside skills/ and runs the other web-dev skills. Needs Node 22.22 or newer."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/detect-project.mjs *) Bash(bash ${CLAUDE_SKILL_DIR}/../../scripts/verify-project.sh *) Bash(mkdir -p *) Bash(pnpm lint:fix) Bash(pnpm check) Bash(pnpm check:report)
---

# develop

Route one request to the workflow that fits the project, run it, and report once. Paths are relative to this skill's directory; the plugin's shared files are in `../../scripts/`, `../../references/` and `../../agents/`.

Run the plugin's scripts exactly as written below, each as one plain command with no pipe or redirect: `allowed-tools` approves these exact forms for the run, so one message runs to the end without a permission prompt, headless included.

- detect: `node ${CLAUDE_SKILL_DIR}/../../scripts/detect-project.mjs <target>`
- regression gates (Workflow B): `bash ${CLAUDE_SKILL_DIR}/../../scripts/verify-project.sh <project-dir>`

## 1. Detect the project

Run detect (`<target>`: the folder the request names, else the current directory). Done when the JSON is read, or a failure below is handled.

| `tier` | The folder holds | Workflow |
|---|---|---|
| `new` | nothing (`state: empty`), or files without `package.json` (`state: other`) | A |
| `template` | an app from the boilerplate (its `apps/web`) | A for a whole app, else C |
| `landing` | a landing page from the boilerplate (its `apps/web`): its UI kit, no API layer or Effect | C with `ui-development` for a **landing** or **ui** request, C with `deploy-setup` for **ci**, else B |
| `same-stack` | the template's stack in another layout | B |
| `other-stack` | React on another stack (`reasons` names what is missing) | B |
| `unsupported` | not React, React behind an SSR framework (Next.js, Remix, Gatsby, Astro), or a monorepo root | stop: report `reasons`. A **ci** request at a monorepo root with `apps/web`: detect `apps/web` and route by its tier, since the pipeline lives at the root |

`otherMajors` lists libraries on another major than `../../references/stack-guidelines.md`: the installed types win over that file.

The tier decides whether the template's rules apply, so a failed detection stops the run instead of a guess:

- `node` missing: tell the user to install Node 22.22 or newer.
- Exit 2, `does not exist`: for an **app** or **setup** request, create the folder and detect again; otherwise ask which folder holds the project.
- Exit 2, `is not a folder` (the path is a file): report it and ask which folder holds the project; create nothing.
- Exit 1, `package.json` is not valid JSON: report it and leave the file as it is.
- Any other failure: report the command and its output.

## 2. Sort the request

| Kind | The request | Route |
|---|---|---|
| **app** | a product to build, on any topic | `new`, `template`: Workflow A. `same-stack`, `other-stack`, `landing`: Workflow B, whole app |
| **setup** | a new project with no features | `new` and `state: empty`: `project-setup`. Otherwise: Workflow B, setup |
| **landing** | a landing or marketing page for a product | `new` and `state: empty`: `project-setup` with `--landing`, then `ui-development` with the description (and design) to fit the page's copy and sections. `template`, `landing`: C with `ui-development`. Otherwise: B |
| **ticket contract** | intent, spec and plan for one or more tickets, before any code | any tier but `unsupported`: `ticket` (several tickets run in parallel, one subagent each) |
| **incident** | an incident report, postmortem or root cause analysis | any tier but `unsupported`: `incident` |
| **pr** | a pull or merge request for the current branch, to send it for review | any tier but `unsupported`: `pr` |
| **feature** | a ticket, page, form or CRUD screen | `template`: C with `feature-development`. Otherwise: B |
| **api** | one endpoint, an error case, a mock, cache invalidation | `template`: C with `api-integration`. Otherwise: B |
| **ui** | a design to match, with no ticket | `template`, `landing`: C with `ui-development`. Otherwise: B |
| **ci** | a CI/CD pipeline, unit or e2e tests in CI, a deploy, the hosting's setup (Cloudflare Pages, GitHub secrets and variables), a move from Netlify | `template`, `landing`: C with `deploy-setup`. Otherwise: **not yet** (CI/CD only in a project from the boilerplate) |
| **not yet** | a bug fix, a review with no edits, a commit or push on its own (beyond the contract commit `ticket` and `incident` make, and the push `pr` makes), or CI/CD work in a project not made from the boilerplate | say this version does not cover it; change nothing |

Sort a mixed request by its largest part (a whole app with a design is **app**; a ticket with a design is **feature**). The first line of the Result is `**Route:** <kind>, <tier>, workflow <A|B|C> (<reason>)`.

## 3. When to ask

Ask once, in one message, before writing code, when:

- a `same-stack`, `other-stack` or `landing` project would need a new dependency (Effect, shadcn/ui, React Hook Form, a router);
- in Workflow B or C, a criterion depends on data, a business rule or the backend contract, and neither the request nor the code answers it;
- the work needs an action outside the folder (push, deploy): this version does none, except the push and the PR or MR that `pr` makes when the user asks for one, and the Cloudflare and GitHub setup `deploy-setup` makes, each command confirmed;
- a **setup** request that does not say whether it is a landing page or a web app (a web app comes with authentication): `project-setup` asks, as its step 2 says, and never picks it for the user.

Everything else gets the simplest default, listed under **Assumptions**. Workflow A never asks: the user asked once and expects a running app (always a web app, so with authentication).

## 4. Run the workflow

- **A, a new app:** follow `references/new-app.md`; the plan it writes takes the shape of `references/plan.md`.
- **B, an existing project**, including a whole app or a setup request in a folder that already has files: follow `references/existing-project.md`; it maps the project with the `codebase-explorer` agent (`../../agents/codebase-explorer.md`).
- **C, one change in a `template` project, or a landing, ui or ci change in a `landing` project:** invoke the skill from step 2 (Skill tool) and follow it through its gates and its Result. Put the **Route:** line on top of that Result; write no second one.
- **setup in an empty folder:** invoke `project-setup`; its Result, with the **Route:** line on top, is the report.
- **landing in an empty folder:** invoke `project-setup` with `--landing` (it asks nothing more), then `ui-development` for the page's copy and sections; one Result.
- **ticket contract, incident, pr:** invoke `ticket`, `incident` or `pr`; its Result, with the **Route:** line on top, is the report.

## Result

Workflows A and B end with one block:

```
## Result
**Route:** kind, tier, workflow, and why
**Did:** what was built or changed (folder or files, features with their routes) and the checklist: A, the table `pnpm check:report` printed; B, the one `verify-project.sh` printed (lint, typecheck, unit tests with their pass rate, build, and the gates the project lacks)
**Saw:** facts observed: the project map (B), existing code reused, real gate output, surprises
**Run it:** (A only) `pnpm dev:mock` (mocked API) or how it is already open; `pnpm dev` with `VITE_API_URL` for a real backend
**Assumptions:** every choice made for the user (A: from docs/plan.md)
**Not done:** anything planned but not built, a failing gate, a gate the project lacks, a skipped visual check
**Blocked by:** unanswered questions, or "nothing"
**Next:** what to confirm or build next
**Design gaps:** (with a design) the line `ui-development` produced
```
