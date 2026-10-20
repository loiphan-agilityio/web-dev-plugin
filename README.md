# web-app-skills

A Claude Code plugin with five skills that build web apps on React 19, Vite 8, TypeScript 6,
Effect 4, TanStack Query 5 (React Query), React Hook Form 7 and shadcn/ui: **build app** (a whole
app from one description), **code skeleton**, **develop feature**, **integrate API** and **design
to UI**.

## See it work

[`examples/task-tracker/`](examples/task-tracker/) is a task tracker written entirely by the
skills, one Claude Code session per ticket: scaffold → tasks list → task detail → dashboard
→ match a design. Every session's prompt and report, screenshots and a recording of the app
are in [`docs/evidence/`](docs/evidence/README.md).

- **Live demo:** [Task Tracker Demo](https://claude.ai/artifact/Mbff8zeHWzLnjDKVdhmeSA), running
  in the browser with a mocked API
- **Summary:** [Web App Skills Report](https://claude.ai/artifact/WsEMWexLj3kYAuvJ8jrvxX)

## Install

```bash
git clone -b <branch> <repo-url> claude-training
claude plugin marketplace add ./claude-training
claude plugin install web-app-skills@claude-training
```

`<branch>` is the branch that holds `.claude-plugin/marketplace.json`; leave out `-b` when it is
the default branch. Then, in an empty folder, one message builds a whole app:
`claude "Build me a library management app: books, members and loans"`.
Other ways to install, the pinned versions and the companion skills are in
[`claude-skills/README.md`](claude-skills/README.md).

## Repository

| Path | What it is |
|---|---|
| [`claude-skills/`](claude-skills/) | The plugin: the five skills and the app template they copy from. |
| [`examples/task-tracker/`](examples/task-tracker/) | Proof-of-concept app built by the skills. |
| [`spec.md`](spec.md) | What the skills must do, and the POC steps. |
| [`DESIGN.md`](DESIGN.md) | How the plugin, the skills and the generated app are built, and why. |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for Claude Code when it works on this repository. |
| [`docs/evidence/`](docs/evidence/README.md) | Gate logs, per-step reports, screenshots and a recording. |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | Marketplace that lists `claude-skills/` as the plugin `web-app-skills`. |
| [`.gitlab-ci.yml`](.gitlab-ci.yml) | Runs the template check on merge requests, pushes and schedules. On another host, run `claude-skills/.claude/skills/code-skeleton/scripts/verify.sh` in your own CI. |
