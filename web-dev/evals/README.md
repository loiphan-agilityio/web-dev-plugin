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
| `15-ci-not-covered` | `template` | a CI request is not covered (pipelines come with the boilerplate): no file written or edited (the fixture already has a workflow), no other skill run, and the answer says so |
| `17-setup-asks-for-auth` | empty | a setup request that does not say whether to include authentication: asks, and runs no `create-project.sh` |
| `18-e2e-feature-template` | `template` | **output quality**, run to the end: a test and a story per component, `pnpm check` runs, the Result has a Route line and claims only what the trace shows |
| `19-e2e-app-empty` | empty | **the main promise**, run to the end: one message gives `docs/plan.md`, the scaffold, every planned feature with a page test and story, `pnpm check`, and a Result that asks nothing and claims only what the trace shows |

`fixtures/` builds the folders; each case's `setup.sh` calls one. `fixtures/check-detect.sh`
checks the tier `scripts/detect-project.mjs` gives each fixture, without a model; `verify.sh`
runs it.

Tags: `routing` (cases 01 to 15 and 17, short runs that stop once the route is clear), `e2e` (cases 18 and 19,
a full feature, or a whole app, with install and gates: slow, several dollars a run for 18 and more for 19), and finer tags within
them: `workflow-a`, `workflow-b`, `workflow-c`, `existing-project`, `no-trigger` (the plugin
must not fire), `edge`, `failure`, `overlap`.

## When evals run: only when the maintainer asks

Every eval run is paid model time, a whole app (case 19) several dollars a run. Nothing runs them
automatically: no hook, schedule, push, merge request or tag starts an eval, the CI jobs are
manual buttons, and Claude never starts one unless the maintainer asks for an eval run in so many
words. A release does not need one. When a run is asked for:

1. **While building or changing a skill, never.** Write or update the case that covers the
   change (a routing change gets one, see `CLAUDE.md`), and check it with the free tools only:
   `pnpm lint`, `bash tools/verify.sh` (which runs `fixtures/check-detect.sh`), and
   `bash tools/validate-skills.sh`.
2. **Only on finished work:** every skill change committed and the free checks and CI green.
   Then one routing run and, when the change touched a workflow, one e2e run.
3. **Never for a single case**, to try a fix, or to check a case that is not a real request.
   `run.sh` refuses `--case`; a fixed case is checked by the next requested run with all the others.

`run.sh` enforces this before it spends anything: it refuses `--case`, uncommitted changes under
`web-dev/` or `tools/`, and plugin content already evaluated with the same options (delete that
`results/` folder to rerun after an infrastructure failure); it runs `tools/verify.sh`
first, and caps the run at `--max-cost-usd 30` when no cap is given. "Already evaluated" is keyed
on the committed content of `skills/`, `agents/`, `references/`, `scripts/` and `evals/`
(READMEs excluded), so a commit that only edits docs or bumps the version reuses the last result.

Each run uses one arm (`--ablation none`), half the cost of two. The no-plugin baseline and its Δ
(`--ablation with-without`) answer a different question, whether the plugin still adds anything,
so ask for it only when a release changes a skill's description or `develop`'s routing (in CI:
start the job with `EVALS_ARGS` set to `--ablation with-without`). The CI jobs are `evals-routing`
and `evals-e2e`, offered on release tags (`web-dev--v<version>`) once the free jobs pass.

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

The first is the routing suite, the second the output-quality cases (20 and 21), the same
commands as CI. With `--ablation with-without`, the headline number is Δ, the score with the
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
