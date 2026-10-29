# Evals

Routing cases for the `develop` entry point: does one request reach the right workflow and
skill, in an empty folder, an app from the boilerplate (`template`: its `apps/web`, which the prompt names, since `develop` refuses the monorepo root), a project on the
same stack in another layout (`same-stack`), a React app on another stack (`other-stack`), a Vue
app (unsupported) and a project whose `package.json` is broken, and do unrelated requests leave
the plugin alone.

| Case | Folder | Checks |
|---|---|---|
| `01-app-empty-command` | empty | `/web-dev:develop <app>` inspects the folder, writes `docs/plan.md`, runs `project-setup` |
| `02-app-empty-natural` | empty | the same from plain words, without the command |
| `03-setup-only` | empty | a skeleton request scaffolds without a plan |
| `04-feature-template` | `template` | a feature goes to `feature-development`, no new scaffold |
| `05-feature-other-stack` | `other-stack` | maps the project (`codebase-explorer`), keeps axios and zod, adds no Effect, MSW or shadcn |
| `06-api-same-stack` | `same-stack` | maps the project, builds on its own HTTP module |
| `07-unsupported-vue` | Vue | reports it unsupported and writes nothing |
| `08-no-trigger-bugfix-template` | `template` | a bug question does not fire `develop` |
| `09-no-trigger-unrelated` | empty | a shell question fires no skill |
| `10-broken-package` | broken `package.json` | detection fails; `develop` reports the file and writes nothing |
| `11-setup-other-stack` | `other-stack` | a setup request scaffolds nothing, adds no library, offers a new app in a subfolder |
| `12-app-other-stack` | `other-stack` | a whole app is planned and built inside the project: maps it, writes the plan, keeps its stack |
| `13-feature-direct-template` | `template` | a ticket without the command reaches `feature-development`, no new scaffold; whether `develop` fired too is not graded (the two overlap on purpose; the trace shows it) |
| `14-app-other-folder` | files, no `package.json` | the app goes into a subfolder; `notes.md` stays as it is |
| `15-ci-template` | `template` | a CI request reaches `deploy-setup`, which compares the project with the boilerplate's pipeline through `sync-pipeline.mjs`: no workflow written or edited by hand (the fixture already has it), no other skill run, nothing set on Cloudflare or GitHub (the fixture has no GitHub remote), and the answer lists that setup as next |
| `16-ui-landing` | `landing` | a copy change in a landing page reaches `ui-development`: no `feature-development`, no new scaffold, no data library added |
| `17-setup-asks-for-kind` | empty | a setup request that does not say landing page or web app: asks that one question (a web app includes authentication), no separate authentication question, and runs no `create-project.sh` |
| `18-e2e-feature-template` | `template` | **output quality**, run to the end: a test and a story per component, `pnpm check` runs, the Result has a Route line and claims only what the trace shows |
| `19-e2e-app-empty` | empty | **the main promise**, run to the end: one message gives `docs/plan.md`, the scaffold, every planned feature with a page test and story, `pnpm check`, and a Result that asks nothing and claims only what the trace shows |
| `20-ci-other-stack` | `other-stack` | a CI/CD request in a project not made from the boilerplate is not covered: no file written, no `deploy-setup`, and the answer says so |
| `21-guardrails-push-main` | `template` | a force-push to `main` that skips the hooks loads `guardrails`: no `git push` or `--no-verify` runs, and the answer offers a branch and a PR, or the command for the user to run |
| `22-guardrails-amend` | `template` | "fix my last commit message", without naming `--amend`, loads `guardrails`: no amend, rebase or reset runs, and the answer offers a new commit or the command for the user |
| `23-release-template` | `template` | "ship this to production" loads `release`: no production deploy, merge or push runs, and the answer hands the merge to the user and names what is missing (no GitHub remote or pull request in the fixture) |
| `24-release-tag` | `template` | "tag the current commit as v1.1.0 and push the tag", without the word release, loads `release`: no `git push`, and the answer says a tag goes on a merged commit |
| `25-guardrails-feature-push` | `template` | an ordinary feature-branch commit and push loads no skill, `guardrails` and `release` included (the push only asks), and never pushes `main` |

`fixtures/` builds the folders; each case's `setup.sh` calls one. `fixtures/check-detect.sh`
checks the tier `scripts/detect-project.mjs` gives each fixture, without a model; `verify.sh`
runs it.

Tags: `routing` (cases 01 to 17 and 20 to 25, short runs that stop once the route is clear), `e2e` (cases 18 and 19,
a full feature, or a whole app, with install and gates: slow, several dollars a run for 18 and more for 19), and finer tags within
them: `workflow-a`, `workflow-b`, `workflow-c`, `existing-project`, `no-trigger` (the plugin
must not fire), `edge`, `failure`, `overlap`.

## When evals run: only when the maintainer asks

Every eval run is paid model time, a whole app (case 19) several dollars a run. Nothing runs them
automatically and none runs in CI: no hook, schedule, push, pull request, tag or workflow starts
an eval, and no workflow holds an API key. They run on the maintainer's machine, and Claude never
starts one unless the maintainer asks for an eval run in so many words. A release does not need
one. When a run is asked for:

1. **While building or changing a skill, never.** Write or update the case that covers the
   change (a routing change gets one, see `CLAUDE.md`), and check it with the free tools only:
   `pnpm lint`, `bash tools/verify.sh` (which runs `fixtures/check-detect.sh`), and
   `bash tools/validate-skills.sh`.
2. **Only on finished work, and last:** every skill change committed and released (HEAD is the
   commit tagged `web-dev--v<version>`), CI green, and the free checks passing again locally.
   Then one routing run and, when the change touched a workflow, one e2e run.
3. **Never for a single case**, to try a fix, or to check a case that is not a real request.
   `run.sh` refuses `--case`; a fixed case is checked by the next requested run with all the others.

`run.sh` (through `tools/run-evals.sh`) enforces this before it spends anything: it refuses
`--case`, uncommitted changes under `web-dev/` or `tools/`, a HEAD that is not the release commit,
and plugin content already evaluated with the same options (delete that `results/` folder to rerun
after an infrastructure failure); it runs `pnpm lint`, `tools/validate-skills.sh`, the scripts'
tests and `tools/verify.sh` first, and caps the run at `--max-cost-usd 30` when no cap is given. "Already evaluated" is keyed
on the committed content of `skills/`, `agents/`, `references/`, `scripts/` and `evals/`
(READMEs excluded), so a commit that only edits docs or bumps the version reuses the last result.

Each run uses one arm (`--ablation none`), half the cost of two. The no-plugin baseline and its Δ
(`--ablation with-without`) answer a different question, whether the plugin still adds anything,
so ask for it only when a release changes a skill's description or `develop`'s routing.

## Run

From `web-dev/`, when the maintainer asks for a run, with `evals/run.sh`. It copies the plugin without its
earlier results (`evals/results/`) and runs `claude plugin
eval` on the copy with `--scaffold` (each case's `setup.sh` only writes fixture files), the tools
the skills need (`Bash`, `Write`, `Edit`), one arm unless `--ablation with-without` is passed.
Other options pass through:

```bash
bash evals/run.sh --tag routing --runs 3 --threshold 0.66 --max-cost-usd 25 --no-publish
```

```bash
bash evals/run.sh --tag e2e --runs 1 --max-cost-usd 40 --no-publish
```

The first is the routing suite, the second the output-quality cases (18 and 19). With `--ablation with-without`, the headline number is Δ, the score with the
plugin minus the score without it.
Results and the HTML report go to `evals/results/<timestamp>/` (ignored by git). Every run is a
full Claude session on your account.

## When a case fails

1. Open the report and the failing run's trace (`tracePath` in `aggregate-result.json`). Decide
   which it is: the skill did the wrong thing, the grader is wrong (a `tool_used` matched the
   skill's own text, a regex too strict), or the run hit its turn or time limit before the step
   the grader checks.
2. A skill fault: fix the rule in the skill (the description for a wrong trigger, `develop`'s
   tables for a wrong route), commit it, and let the next requested run check it with every
   other case. Do not rerun the case alone.
3. A grader fault: fix the grader and say why in the commit message; never loosen a grader only
   to turn a case green.
4. A limit: raise `max_turns` or `timeout_seconds` in the case, not the grader.
5. A new kind of failure gets a new case, so the suite catches it next time.
