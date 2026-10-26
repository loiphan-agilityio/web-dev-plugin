# web-dev

This repository ships the **web-dev** Claude Code plugin: an entry skill, `develop`, that inspects
the project and routes a request to the skills that build web apps on React 19, Vite 8,
TypeScript 6, Effect 4, TanStack Query 5, React Hook Form 7 and shadcn/ui, and the skills that write
the contracts around the code: `ticket` (docs/tickets/<id>/), `incident` (docs/incidents/<id>/)
and `pr` (a pull or merge request's description). `deploy-setup` brings the boilerplate's CI/CD
(unit and e2e tests, Cloudflare Pages deploys) into a project made from it.
What the skills must do is in `spec.md`, how they are built in `DESIGN.md`, and how to run the
demo in `README.md`.

It also ships **web-quality**, a second plugin in the same marketplace: an entry skill, `audit`,
that measures a page and its build and routes findings to `performance`, `accessibility`, `seo`
and `security`. Its own rules are under "Rules for changing web-quality" below; everything else
here (Git, LF, evals only on request) applies to both.

## Layout

```
.claude-plugin/marketplace.json   marketplace: lists web-dev/ and web-quality/ as the plugins of
                                  those names
.claude/                          for maintaining this repo, not part of the plugin: agents/
                                  (companion-auditor, skill-reviewer, version-scout), settings.json
.github/workflows/                the checks, on GitHub Actions: ci.yml (pull requests, pushes
                                  to main, tags, weekly), companions.yml (weekly); no model
                                  evals (they run only locally, tools/run-evals.sh)
tools/                            maintainer scripts, not shipped: verify.sh, run-evals.sh,
                                  extract-snippets.mjs, check-guidelines.mjs,
                                  check-create-project.sh, check-sync-pipeline.sh,
                                  sync-references.sh, lint.sh, validate-skills.sh
web-dev/                          the plugin (its README.md is the user guide)
  .claude-plugin/plugin.json      name, version
  CHANGELOG.md                    one entry per release (version bump + tag web-dev--v<version>)
  skills/                         the product: develop (entry), project-setup, feature-development,
                                  api-integration, ui-development, deploy-setup, ticket, incident,
                                  pr (their contract templates in references/)
    project-setup/scripts/        create-project.sh (a new project from the boilerplate: landing
                                  page, or web app, always with auth), install-companions.sh
    deploy-setup/scripts/         sync-pipeline.mjs (the boilerplate's CI/CD, test and Cloudflare
                                  Pages files at the pin, copied from a project create-project.sh
                                  makes)
  references/                     shared guidelines: stack-guidelines, coding-standards, architecture
  scripts/                        detect-project.mjs, verify-project.sh, check-contract.mjs (run
                                  by the skills), and check-contract's tests in scripts/test/
  agents/                         codebase-explorer (shipped with the plugin)
  evals/                          routing and e2e cases for `claude plugin eval`, run.sh, fixtures
  docs/companion-audit.md         security and fit audit of the 8 companion skills
web-quality/                      the second plugin (its README.md is the user guide)
  .claude-plugin/plugin.json      name, version
  CHANGELOG.md                    one entry per release (version bump + tag web-quality--v<version>)
  skills/                         audit (entry), performance, accessibility, seo, security; each
                                  keeps its depth in references/
  references/thresholds.md        Core Web Vitals, bundle budgets, Lighthouse targets, WCAG AA
  scripts/                        check-headers.mjs, bundle-budget.mjs, pagespeed.mjs (read-only,
                                  JSON out), the command-line plumbing they share in lib/cli.mjs,
                                  and their tests in scripts/test/
  evals/                          routing cases, run.sh, fixtures
examples/                         demo output, local only (ignored by git)
docs/evidence/                    reports, logs and screenshots from a demo run, local only (ignored)
```

## Commands

| Command | What it proves |
|---|---|
| `pnpm install` (repository root) | Installs the git hooks (husky) and the tools they and `pnpm lint` use. Run it once after cloning. |
| `pnpm lint` (repository root) | ShellCheck on the scripts and `node --check` on the `.mjs` scripts. |
| `bash tools/verify.sh` | Each eval fixture gets its tier, `create-project.sh` creates the two boilerplate variants (landing page, web app with auth) and refuses what `check-create-project.sh` expects, `sync-pipeline.mjs` brings a project from the last Netlify commit to the pinned pipeline and refuses what `check-sync-pipeline.sh` expects, and in a project created from the boilerplate at its pinned commit (network) `references/` match its `apps/web/CLAUDE.md`, the format hook works and the quoted todos feature passes all six gates (lint, typecheck, test, build, Storybook build, Playwright e2e; it installs Chromium first). `BOILERPLATE_REPO=<path or URL>` tests a boilerplate branch before it is merged (that repository's checked-out branch), `BOILERPLATE_REF=main` the latest boilerplate. Same as CI, whose weekly run uses `main`. |
| `bash tools/sync-references.sh` | Copies the shared guideline sections from the boilerplate's `apps/web/CLAUDE.md` (the pinned commit: network; `BOILERPLATE_REPO` and `BOILERPLATE_REF` as above) into `web-dev/references/`, keeping each file's preamble. Run it after moving the pin past a guideline change, then review and commit the diff. |
| `bash evals/run.sh --tag routing` in `web-dev/` | The routing evals, one arm (`--ablation with-without` adds the no-plugin baseline; `--tag e2e` for output quality), through `tools/run-evals.sh`. Paid and local only: only when the user asks, on the release commit, after every free check (see the rule below and `web-dev/evals/README.md`). |
| `bash tools/validate-skills.sh` (after `pip install skills-ref==0.1.1 pyyaml==6.0.3` and skill-validator 1.8.0: `go install github.com/agent-ecosystem/skill-validator/cmd/skill-validator@v1.8.0` or its release binary) | Every skill passes the Agent Skills specification's validator (valid YAML frontmatter, only spec fields, `name` matches its folder) and skill-validator's `check --strict` (internal links resolve, every file under a skill is named by its text, content; a warning fails too, and no model is called), and every eval `case.yaml` parses. Also a CI job. |
| `claude plugin validate --strict web-dev/.claude-plugin/plugin.json` (and `web-quality/...`, and `.` for the marketplace) | Each plugin manifest and the marketplace manifest are valid. |
| `node --test web-dev/scripts/test/*.test.mjs web-quality/scripts/test/*.test.mjs` | web-dev's contract check against temporary folders (the shipped templates included), and web-quality's measurement scripts against local servers and temporary builds, no network. Also a CI job. |
| `bash evals/run.sh --tag routing` in `web-quality/` | web-quality's routing evals. Paid, as above. |

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
  without the plugin. The boilerplate is the source: change a section there, then run
  `bash tools/sync-references.sh` here and commit what it copied. `check-guidelines.mjs` (in
  `verify.sh`) fails when the two differ and names that command. Edit only the preamble above a
  section in `references/`.
- **Skills reach the plugin's shared files by relative path** (`../../references/`,
  `../../scripts/`, `../../agents/`), which holds both for the installed plugin and for a project
  that copies `skills/`, `references/`, `scripts/` and `agents/` into its `.claude/`.
- **Change the boilerplate first, then the skills.** Run `pnpm check` in the boilerplate, push it,
  run `verify.sh` with `BOILERPLATE_REPO=file://<clone>` (that clone's checked-out branch), then
  update every snippet that quotes a changed file.
- **The boilerplate is pinned to a commit** (`pinned=` in
  `web-dev/skills/project-setup/scripts/create-project.sh`): every project a plugin release creates,
  and every check here, uses that commit, so a release never scaffolds code its skills do not
  match. After a boilerplate change is merged, move the pin to the merge commit
  (`git ls-remote <boilerplate> refs/heads/main`), run `sync-references.sh` and `verify.sh`, and
  ship the pin in the same pull request as the skill changes that need it. `deploy-setup` copies
  the pipeline from a project created at the pin, so the pin move carries it too; a pipeline file
  the boilerplate adds, renames or removes goes into the lists at the top of `sync-pipeline.mjs`
  and into `check-sync-pipeline.sh`. CI's weekly run tries
  the boilerplate's `main` (`BOILERPLATE_REF=main`) to show drift before the pin moves.
- **Companion skills are pinned to an audited commit** in `install-companions.sh`. Upgrading one
  means reading the diff and updating the SHA there, in `web-dev/README.md` and in
  `web-dev/docs/companion-audit.md`, and its overrides in `web-dev/references/companions.md`. The
  same for the `skills` CLI version (`skills_cli` in that script): read its changelog first.
- **Commands a skill runs** are listed in its `allowed-tools` frontmatter, and the plugin's
  scripts are spelled `${CLAUDE_SKILL_DIR}/...` in `SKILL.md` exactly as in that rule, so one
  message runs without a permission prompt (headless and untrusted folders included). A new
  command in a skill gets its rule in the same change; never add `Bash(*)`, `git` or `npx` there.
- **Release:** bump `version` in `web-dev/.claude-plugin/plugin.json` (a git install is a cached
  copy: without a bump, teams never receive the change), add its entry to
  `web-dev/CHANGELOG.md`, and tag the release commit `web-dev--v<version>`.
- **Routing changes** (a skill's description, `develop`'s tables, `detect-project.mjs`) get an
  eval case in `web-dev/evals/`; a new fixture gets a line in `fixtures/check-detect.sh`.
- **Run the model evals only when the user asks for an eval run** (they cost credits), and only
  on this machine: never in CI, so no workflow holds an Anthropic API key. Never on your own
  initiative: not while a skill is being built or changed, not to try a fix, not for one case or
  a case that is not a real request, not as part of a commit or a push, and never by adding a
  hook, schedule or CI job. Evals come last: the skill is finished and released (its tag
  `<plugin>--v<version>` on HEAD) and every free check passes first (`pnpm lint`,
  `validate-skills.sh`, the scripts' tests, `verify.sh`). `tools/run-evals.sh`, which each
  plugin's `evals/run.sh` calls, refuses anything else before it spends.
- Keep files LF (`.gitattributes`); the shell scripts fail on CRLF.
- `examples/` and `docs/evidence/` are demo output: they stay local and are never committed
  (`.gitignore`). Fix a problem in a demo app by fixing the skill or the boilerplate and running the
  demo again, not by editing the app by hand.

## Rules for changing web-quality

- **Measure, then claim.** A skill tells Claude to measure first and to label each finding
  measured, config or hypothesis; keep that in every new step. Numbers are judged only against
  `web-quality/references/thresholds.md`: change a threshold there, with its source, not in a skill.
- **Every code block is run before it is written down.** A browser snippet runs in a real browser
  on the boilerplate's deploy (the tab visible: a hidden tab records no paint); a project file
  (a Playwright spec, a config line) runs in a project created from the boilerplate with its gates
  green. A block that shows a pattern not run that way is marked ` ```ts sketch ` and says so.
- **Facts about a host or a browser are observed, not assumed:** run `check-headers.mjs` or `curl`
  on the deployed URL and write what it returned (the skills say, for example, that Netlify's draft
  deploys of the boilerplate answer `X-Robots-Tag: noindex` and the live site none).
- **Scripts stay read-only and print JSON** (`{ checks: [{ id, status, detail }] }`), exit 2 with
  the cause on stderr when they cannot run, use only Node's standard library, and get a test in
  `scripts/test/` for every check, including its failing case. A new check gets its line in the
  skill that reads it.
- **Commands a skill runs** follow the web-dev rule above: `${CLAUDE_SKILL_DIR}/../../scripts/...`
  in `allowed-tools`, never `Bash(*)`, `git` or `npx`. Lighthouse stays optional: the user runs it,
  or Chrome DevTools MCP does.
- **Release:** bump `version` in `web-quality/.claude-plugin/plugin.json`, add the entry to
  `web-quality/CHANGELOG.md`, tag the release commit `web-quality--v<version>`.

## Git

- Commit only what the change touches; stage exact paths and read back
  `git diff --cached --name-only` before committing.
- Messages follow Conventional Commits (`feat(ui-development): ...`), checked by commitlint in the
  `commit-msg` hook. The `pre-commit` hook runs ShellCheck and `node --check` on staged scripts.
  Never commit with `--no-verify`.
- `main` changes only through a squash-merged pull request whose four CI checks pass:
  `.github/rulesets/main.json`, applied once by a repository admin with
  `gh api -X POST repos/<owner>/<repo>/rulesets --input .github/rulesets/main.json`. After
  renaming a CI job, update its name there.
