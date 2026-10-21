# web-dev

This repository ships the **web-dev** Claude Code plugin: an entry skill, `develop`, that inspects
the project and routes a request to four skills that build web apps on React 19, Vite 8,
TypeScript 6, Effect 4, TanStack Query 5, React Hook Form 7 and shadcn/ui.
What the skills must do is in `spec.md`, how they are built in `DESIGN.md`, and how to run the
demo in `README.md`.

## Layout

```
.claude-plugin/marketplace.json   marketplace: lists web-dev/ as the plugin web-dev
.claude/                          for maintaining this repo, not part of the plugin: agents/
                                  (companion-auditor, skill-reviewer, version-scout), settings.json
.gitlab-ci.yml                    runs tools/verify-template.sh on merge requests, pushes, schedules
tools/                            maintainer scripts, not shipped: verify-template.sh,
                                  extract-snippets.mjs, check-guidelines.mjs
web-dev/                          the plugin (its README.md is the user guide)
  .claude-plugin/plugin.json      name, version
  skills/                         the product: develop (entry), project-setup, feature-development,
                                  api-integration, ui-development
    project-setup/assets/app-template/   the reference app every snippet is copied from
    project-setup/scripts/        scaffold.sh, install-companions.sh
  references/                     shared guidelines: stack-guidelines, coding-standards, architecture
  scripts/                        detect-project.mjs, verify-project.sh (run by the skills)
  agents/                         codebase-explorer (shipped with the plugin)
  evals/                          routing and e2e cases for `claude plugin eval`, run.sh, fixtures
  docs/companion-audit.md         security and fit audit of the 8 companion skills
examples/                         demo output, local only (ignored by git)
docs/evidence/                    reports, logs and screenshots from a demo run, local only (ignored)
```

## Commands

| Command | What it proves |
|---|---|
| `pnpm install` (repository root) | Installs the git hooks (husky) and the template's dependencies, which the hooks and `pnpm lint` use. Run it once after cloning. |
| `pnpm lint` (repository root) | ShellCheck on the scripts, `node --check` on the `.mjs` scripts, `check-guidelines.mjs`, and the template's ESLint, Prettier and TypeScript. |
| `bash tools/verify-template.sh` | `references/` match the template's `CLAUDE.md`, each eval fixture gets its tier, and a fresh scaffold passes all five gates (lint, typecheck, test, build, Storybook build), with and without the quoted todos feature. Same as CI. |
| `bash evals/run.sh --tag routing` in `web-dev/` | The routing evals with a baseline arm without the plugin (`web-dev/evals/README.md`; `--tag e2e` for output quality). Runs Claude sessions on your account. |
| `pnpm check` in `web-dev/skills/project-setup/assets/app-template/` | The template itself passes the gates. |
| `bash tools/validate-skills.sh` (after `pip install skills-ref==0.1.1`) | Every skill passes the Agent Skills specification's validator: valid YAML frontmatter, only spec fields, `name` matches its folder. Also a CI job. |
| `claude plugin validate --strict web-dev/.claude-plugin/plugin.json` | The plugin manifest is valid. |

The template pins pnpm in `packageManager`; run pnpm from inside the template or an app so
corepack picks that version.

## Rules for changing the skills

- **Never write library code from memory.** Effect 4, React Router 8, MSW 3, Vitest 5, Storybook 10
  and TypeScript 6 are newer than most training data. Every code block in a skill is copied from
  `project-setup/assets/app-template/` or from the todos feature already quoted in the references. Each
  todos block names its file in the fence (` ```tsx file=src/features/todos/... `), and
  `verify-template.sh` writes those blocks into a fresh scaffold and runs every gate on them, so the
  markdown is the todos feature's only source. A block that shows a pattern found in neither is
  marked ` ```ts sketch ` and says so.
- **Shared guidelines live in `web-dev/references/`:** version traps in `stack-guidelines.md`,
  code style in `coding-standards.md`, the data flow in `architecture.md`. Skills point there
  (`../../references/` from a skill) and keep only the traps of their own step. The template's
  `CLAUDE.md` carries the same sections word for word, so a scaffolded app has them without the
  plugin; `check-guidelines.mjs` fails when the two differ, so change both together.
- **Skills reach the plugin's shared files by relative path** (`../../references/`,
  `../../scripts/`, `../../agents/`), which holds both for the installed plugin and for a project
  that copies `skills/`, `references/`, `scripts/` and `agents/` into its `.claude/`.
- **Change the template first, then the skills.** Run `pnpm check` in the template and
  `verify-template.sh`, then update every snippet that quotes a changed file.
- **Companion skills are pinned to an audited commit** in `install-companions.sh`. Upgrading one
  means reading the diff and updating the SHA there, in `web-dev/README.md` and in
  `web-dev/docs/companion-audit.md`, and its overrides in `web-dev/references/companions.md`.
- **Release:** bump `version` in `web-dev/.claude-plugin/plugin.json`.
- **Routing changes** (a skill's description, `develop`'s tables, `detect-project.mjs`) get an
  eval case in `web-dev/evals/`; a new fixture gets a line in `fixtures/check-detect.sh`.
- Keep files LF (`.gitattributes`); the shell scripts fail on CRLF.
- `examples/` and `docs/evidence/` are demo output: they stay local and are never committed
  (`.gitignore`). Fix a problem in a demo app by fixing the skill or the template and running the
  demo again, not by editing the app by hand.

## Git

- Commit only what the change touches; stage exact paths and read back
  `git diff --cached --name-only` before committing.
- Messages follow Conventional Commits (`feat(ui-development): ...`), checked by commitlint in the
  `commit-msg` hook. The `pre-commit` hook runs ShellCheck and `node --check` on staged scripts,
  the template's ESLint and Prettier on staged template files, and its TypeScript when a template
  `.ts`/`.tsx` file is staged. Never commit with `--no-verify`.
