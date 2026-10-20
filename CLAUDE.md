# web-app-skills

This repository ships the **web-app-skills** Claude Code plugin: four skills that build web apps
on React 19, Vite 8, TypeScript 6, Effect 4, TanStack Query 5, React Hook Form 7 and shadcn/ui.
What the skills must do is in `spec.md`, how they are built in `DESIGN.md`, and a proof-of-concept
app built by the skills themselves in `examples/task-tracker/`.

## Layout

```
.claude-plugin/marketplace.json   marketplace: lists claude-skills/ as the plugin web-app-skills
.gitlab-ci.yml                    runs verify.sh on merge requests, pushes and schedules
claude-skills/                    the plugin (its README.md is the user guide)
  .claude-plugin/plugin.json      name, version
  .claude/skills/                 the product: code-skeleton, develop-feature, integrate-api, design-to-ui
    code-skeleton/template/       the reference app every snippet is copied from
    code-skeleton/scripts/        scaffold.sh, verify.sh, install-companions.sh
  .claude/agents/                 helpers for maintaining this repo, never copied into projects
  docs/companion-audit.md         security and fit audit of the 8 companion skills
examples/task-tracker/            POC app, written by the skills from the tickets in docs/evidence/poc/
docs/evidence/                    gate logs, screenshots, recording and per-step reports of the POC
```

## Commands

| Command | What it proves |
|---|---|
| `bash claude-skills/.claude/skills/code-skeleton/scripts/verify.sh` | A fresh scaffold passes all five gates (lint, typecheck, test, build, Storybook build). Same as CI. |
| `pnpm check` in `claude-skills/.claude/skills/code-skeleton/template/` | The template itself passes the gates. |
| `pnpm install && pnpm check` in `examples/task-tracker/` | The POC app passes the gates. |
| `claude plugin validate --strict claude-skills/.claude-plugin/plugin.json` | The plugin manifest is valid. |

The template pins pnpm in `packageManager`; run pnpm from inside the template or an app so
corepack picks that version.

## Rules for changing the skills

- **Never write library code from memory.** Effect 4, React Router 8, MSW 3, Vitest 5, Storybook 10
  and TypeScript 6 are newer than most training data. Every code block in a skill is copied from
  `code-skeleton/template/` or from the todos feature already quoted in the references. Each
  todos block names its file in the fence (` ```tsx file=src/features/todos/... `), and
  `verify.sh` writes those blocks into a fresh scaffold and runs every gate on them, so the
  markdown is the todos feature's only source. A block that shows a pattern found in neither is
  marked ` ```ts sketch ` and says so.
- **Version traps live in one place:** `code-skeleton/template/CLAUDE.md`, section "Library
  versions newer than most training data". Skills point there and keep only the traps of their
  own step.
- **Change the template first, then the skills.** Run `pnpm check` in the template and
  `verify.sh`, then update every snippet that quotes a changed file.
- **Companion skills are pinned to an audited commit** in `install-companions.sh`. Upgrading one
  means reading the diff and updating the SHA there, in `claude-skills/README.md` and in
  `claude-skills/docs/companion-audit.md`.
- **Release:** bump `version` in `claude-skills/.claude-plugin/plugin.json`.
- Keep files LF (`.gitattributes`); the shell scripts fail on CRLF.
- `examples/task-tracker/` is output of the skills, kept as evidence (only its demo build is
  hand-written). Fix a problem in it by fixing the skill or the template, not by editing the
  example by hand.

## Git

- Commit only what the change touches; stage exact paths and read back
  `git diff --cached --name-only` before committing.
