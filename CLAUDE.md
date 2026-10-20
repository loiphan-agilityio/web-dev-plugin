# claude-training (branch web-development-skills)

This branch ships the **web-app-skills** Claude Code plugin for ticket
[granbull/space#5127](https://gitlab.asoft-python.com/granbull/space/-/work_items/5127): four
skills that build web apps on the team stack. What it must do is in `spec.md`, how it is built in
`DESIGN.md`, proof that it works in `docs/evidence/`.

## Layout

```
.claude-plugin/marketplace.json   marketplace: lists claude-skills/ as the plugin web-app-skills
.gitlab-ci.yml                    runs verify.sh on MRs, pushes and schedules
claude-skills/                    the plugin (its README.md is the user guide)
  .claude-plugin/plugin.json      name, version
  .claude/skills/                 the product: code-skeleton, develop-feature, integrate-api, design-to-ui
    code-skeleton/template/       the reference app every snippet is copied from
    code-skeleton/scripts/        scaffold.sh, verify.sh, install-companions.sh
  .claude/agents/                 helpers for maintaining this repo, never copied into projects
  docs/companion-audit.md         security and fit audit of the 8 companion skills
docs/evidence/                    gate log, screenshots, video and stories of the todos example app
```

## Commands

| Command (from `claude-skills/`) | What it proves |
|---|---|
| `bash .claude/skills/code-skeleton/scripts/verify.sh` | A fresh scaffold passes all five gates (lint, typecheck, test, build, Storybook build). Same as CI. |
| `cd .claude/skills/code-skeleton/template && pnpm check` | The template itself passes the gates. |
| `claude plugin validate --strict .claude-plugin/plugin.json` | The plugin manifest is valid. |

The template pins `pnpm@11.17.0` in `packageManager`; run pnpm from inside the template or a
scaffolded app so corepack picks that version.

## Rules for changing the skills

- **Never write library code from memory.** Effect 4, React Router 8, MSW 3, Vitest 5, Storybook 10
  and TypeScript 6 are newer than most training data. Every code block in a skill is copied from
  `code-skeleton/template/` or from the todos feature already quoted in
  `develop-feature/references/`. A block that shows a pattern found in neither is marked
  ` ```ts sketch ` and says so.
- **Version traps live in one place:** `code-skeleton/template/CLAUDE.md`, section "Library
  versions newer than most training data". Skills point there and keep only the traps of their
  own step.
- **Change the template first, then the skills.** Run `pnpm check` in the template and
  `verify.sh`, then update every snippet that quotes a changed file.
- **Companion skills are pinned to an audited commit** in `install-companions.sh`. Upgrading one
  means reading the diff and updating the SHA there and in `claude-skills/README.md`.
- **Release:** bump `version` in `claude-skills/.claude-plugin/plugin.json`.
- Keep files LF (`claude-skills/.gitattributes`); the shell scripts fail on CRLF.

## Git

- Work on `web-development-skills`. The repository's default branch (`practice-02`) is another
  project: do not merge into it.
- Commit only what the change touches; stage exact paths and read back
  `git diff --cached --name-only` before committing.
