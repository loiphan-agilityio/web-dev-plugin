# web-dev

A Claude Code plugin for web apps on React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query 5
(React Query), React Hook Form 7 and shadcn/ui. One entry point, `/web-dev:develop <request>`,
inspects the folder (empty, an app from the plugin's template, or another React project), picks
the workflow and runs the skills that do the work: **project setup**, **feature development**,
**API integration** and **UI development**.

## Demo

One message builds a whole app. After installing the plugin (below), in an empty folder:

```bash
mkdir -p examples/library-manager && cd examples/library-manager
claude "/web-dev:develop Build me a library management app. Librarians manage the book catalogue and the members, lend books to members and record returns, and need to see which loans are overdue."
```

The output is the app in `examples/library-manager/`: `docs/plan.md` (the data model, API,
tickets and assumptions the skill chose), every planned page with its API layer, mocks, tests and
stories, and all gates green. The run opens the app on a mocked API, or tells you to run
`pnpm dev:mock`. `examples/` stays on your machine: `.gitignore` lists it, and `docs/evidence/`
for the reports, logs and screenshots you collect from a run.

## Install

See [`web-dev/README.md`](web-dev/README.md#install): install from the git host, updates, headless
runs, the pinned versions and the companion skills.

## Repository

| Path | What it is |
|---|---|
| [`web-dev/`](web-dev/) | The plugin: the `develop` entry skill, four skills, the app template they copy from, shared references, scripts and evals. |
| `examples/`, `docs/evidence/` | Demo output and what a run collected (reports, logs, screenshots), local only: not in the repository. |
| [`spec.md`](spec.md) | What the skills must do, and the POC steps. |
| [`DESIGN.md`](DESIGN.md) | How the plugin, the skills and the generated app are built, and why. |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for Claude Code when it works on this repository. |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | Marketplace that lists `web-dev/` as the plugin `web-dev`. |
| [`.gitlab-ci.yml`](.gitlab-ci.yml) | Runs the free checks on merge requests, pushes and schedules (`tools/verify.sh`: the code the skills quote, in a project from the boilerplate). On another host, run `tools/verify.sh` in your own CI. |
