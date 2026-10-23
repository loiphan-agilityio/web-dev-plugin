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
.github/workflows/                the same checks on GitHub Actions: ci.yml (pull requests, pushes
                                  to main, tags, weekly), companions.yml (weekly), evals.yml
                                  (by hand only)
.gitlab-ci.yml                    runs tools/verify.sh on merge requests, pushes, schedules
tools/                            maintainer scripts, not shipped: verify.sh,
                                  extract-snippets.mjs, check-guidelines.mjs,
                                  check-create-project.sh
web-dev/                          the plugin (its README.md is the user guide)
  .claude-plugin/plugin.json      name, version
  CHANGELOG.md                    one entry per release (version bump + tag web-dev--v<version>)
  skills/                         the product: develop (entry), project-setup, feature-development,
                                  api-integration, ui-development
    project-setup/scripts/        create-project.sh (a new project from the boilerplate, with or
                                  without auth), install-companions.sh
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
| `pnpm install` (repository root) | Installs the git hooks (husky) and the tools they and `pnpm lint` use. Run it once after cloning. |
| `pnpm lint` (repository root) | ShellCheck on the scripts and `node --check` on the `.mjs` scripts. |
| `bash tools/verify.sh` | Each eval fixture gets its tier, `create-project.sh` creates both boilerplate variants and refuses what `check-create-project.sh` expects, and in a project created from the boilerplate (clones it: network) `references/` match its `apps/web/CLAUDE.md`, the format hook works and the quoted todos feature passes all five gates (lint, typecheck, test, build, Storybook build). Same as CI. |
| `bash evals/run.sh --tag routing` in `web-dev/` | The routing evals, one arm (`--ablation with-without` adds the no-plugin baseline; `--tag e2e` for output quality). Paid: only when the user asks, see the rule below and `web-dev/evals/README.md`. |
| `bash tools/validate-skills.sh` (after `pip install skills-ref==0.1.1`) | Every skill passes the Agent Skills specification's validator: valid YAML frontmatter, only spec fields, `name` matches its folder. Also a CI job. |
| `claude plugin validate --strict web-dev/.claude-plugin/plugin.json` | The plugin manifest is valid. |

The boilerplate pins pnpm in `packageManager`; run pnpm from inside a project made from it so
corepack picks that version.

## Rules for changing the skills

- **Never write library code from memory.** Effect 4, React Router 8, MSW 3, Vitest 5, Storybook 10
  and TypeScript 6 are newer than most training data. Every code block in a skill is copied from
  the boilerplate's `apps/web` (`tools/verify.sh --keep` leaves a project made from it) or from the
  todos feature already quoted in the references. Each
  todos block names its file in the fence (` ```tsx file=src/features/todos/... `), and
  `verify.sh` writes those blocks into a project created from the boilerplate and runs every gate on them, so the
  markdown is the todos feature's only source. A block that shows a pattern found in neither is
  marked ` ```ts sketch ` and says so.
- **Shared guidelines live in `web-dev/references/`:** version traps in `stack-guidelines.md`,
  code style in `coding-standards.md`, the data flow in `architecture.md`. Skills point there
  (`../../references/` from a skill) and keep only the traps of their own step. The boilerplate's
  `apps/web/CLAUDE.md` carries the same sections word for word, so a project from it has them
  without the plugin; `check-guidelines.mjs` (in `verify.sh`) fails when the two differ, so change
  both together (the boilerplate first).
- **Skills reach the plugin's shared files by relative path** (`../../references/`,
  `../../scripts/`, `../../agents/`), which holds both for the installed plugin and for a project
  that copies `skills/`, `references/`, `scripts/` and `agents/` into its `.claude/`.
- **Change the boilerplate first, then the skills.** Run `pnpm check` in the boilerplate, push it,
  run `verify.sh` (it clones the default branch; `BOILERPLATE_REPO=file://<clone>` tries a local
  commit first), then update every snippet that quotes a changed file.
- **Companion skills are pinned to an audited commit** in `install-companions.sh`. Upgrading one
  means reading the diff and updating the SHA there, in `web-dev/README.md` and in
  `web-dev/docs/companion-audit.md`, and its overrides in `web-dev/references/companions.md`.
- **Commands a skill runs** are listed in its `allowed-tools` frontmatter, and the plugin's
  scripts are spelled `${CLAUDE_SKILL_DIR}/...` in `SKILL.md` exactly as in that rule, so one
  message runs without a permission prompt (headless and untrusted folders included). A new
  command in a skill gets its rule in the same change; never add `Bash(*)`, `git` or `npx` there.
- **Release:** bump `version` in `web-dev/.claude-plugin/plugin.json` (a git install is a cached
  copy: without a bump, teams never receive the change), add its entry to
  `web-dev/CHANGELOG.md`, and tag the release commit `web-dev--v<version>`.
- **Routing changes** (a skill's description, `develop`'s tables, `detect-project.mjs`) get an
  eval case in `web-dev/evals/`; a new fixture gets a line in `fixtures/check-detect.sh`.
- **Run the model evals only when the user asks for an eval run** (they cost credits). Never on
  your own initiative: not to try a fix, not for one case, not as part of a release, a commit or
  a push, and never by adding a hook, schedule or automatic CI trigger. Check work with the free
  tools (`pnpm lint`, `verify.sh`, `validate-skills.sh`).
- Keep files LF (`.gitattributes`); the shell scripts fail on CRLF.
- `examples/` and `docs/evidence/` are demo output: they stay local and are never committed
  (`.gitignore`). Fix a problem in a demo app by fixing the skill or the boilerplate and running the
  demo again, not by editing the app by hand.

## Git

- Commit only what the change touches; stage exact paths and read back
  `git diff --cached --name-only` before committing.
- Messages follow Conventional Commits (`feat(ui-development): ...`), checked by commitlint in the
  `commit-msg` hook. The `pre-commit` hook runs ShellCheck and `node --check` on staged scripts.
  Never commit with `--no-verify`.
