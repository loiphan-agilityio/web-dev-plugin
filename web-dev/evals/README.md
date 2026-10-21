# Evals

Routing cases for the `develop` entry point: does one request reach the right workflow and
skill, in an empty folder, an app scaffolded from the template (`template`), a project on the
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
| `13-feature-direct-template` | `template` | a ticket without the command reaches `feature-development`; records whether `develop` fired too (the two overlap on purpose) |
| `14-app-other-folder` | files, no `package.json` | the app goes into a subfolder; `notes.md` stays as it is |
| `20-e2e-feature-template` | `template` | **output quality**, run to the end: a test and a story per component, `pnpm check` runs, the Result has a Route line and claims only what the trace shows |

`fixtures/` builds the folders; each case's `setup.sh` calls one. `fixtures/check-detect.sh`
checks the tier `scripts/detect-project.mjs` gives each fixture, without a model; `verify-template.sh`
runs it.

Tags: `routing` (cases 01 to 14, short runs that stop once the route is clear), `e2e` (case 20,
a full feature with install and gates: slow and several dollars a run), and finer tags within
them: `workflow-a`, `workflow-b`, `workflow-c`, `existing-project`, `no-trigger` (the plugin
must not fire), `edge`, `failure`, `overlap`.

## Run

From `web-dev/`, with `evals/run.sh`. It copies the plugin without `node_modules` (on the plugin
folder itself, once the root `pnpm install` has filled the template's `node_modules`, `claude
plugin eval` fails with `E2BIG`) and runs `claude plugin eval` on the copy with `--scaffold`
(each case's `setup.sh` only writes fixture files), the tools the skills need (`Bash`, `Write`,
`Edit`) and a baseline arm without the plugin (`--ablation with-without`). Other options pass
through:

```bash
bash evals/run.sh --tag routing --runs 1 --no-publish
```

```bash
bash evals/run.sh --tag routing --max-cost-usd 20
```

```bash
bash evals/run.sh --tag e2e --runs 1 --max-cost-usd 15
```

The first is a pilot, the second the full routing suite (3 runs per case), the third the
output-quality case. Results and the HTML report go to `evals/results/<timestamp>/` (ignored by
git). Every run is a full Claude session on your account.

## When to run

- After any change to a skill's description, `develop`'s tables or rules, an agent, or
  `scripts/detect-project.mjs`: the routing suite. The headline number is Δ, the score with the
  plugin minus the score without it.
- Before a release (`version` in `plugin.json`): routing and e2e.
- CI runs the routing suite on pipeline schedules when the `ANTHROPIC_API_KEY` variable is set
  (job `evals` in `.gitlab-ci.yml`).

## When a case fails

1. Open the report and the failing run's trace (`tracePath` in `aggregate-result.json`). Decide
   which it is: the skill did the wrong thing, the grader is wrong (a `tool_used` matched the
   skill's own text, a regex too strict), or the run hit its turn or time limit before the step
   the grader checks.
2. A skill fault: fix the rule in the skill (the description for a wrong trigger, `develop`'s
   tables for a wrong route), then rerun that case with `--case <name> --runs 3`.
3. A grader fault: fix the grader and say why in the commit message; never loosen a grader only
   to turn a case green.
4. A limit: raise `max_turns` or `timeout_seconds` in the case, not the grader.
5. A new kind of failure gets a new case, so the suite catches it next time.
