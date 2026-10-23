---
name: ci-setup
description: This skill should be used when the user asks to "set up CI", "add a CI pipeline that runs the tests", "run the unit tests on every push", "add a GitHub Actions workflow for the tests" or "add GitLab CI for our unit tests" in a React project, built from the web-dev template or on its own stack. It asks whether the pipeline runs on GitHub or GitLab, writes one pipeline that installs from the lockfile and runs the whole unit-test suite on every push, then runs the project's gates. Not for deploys or releases (CD), or for fixing a failing pipeline.
compatibility: "Claude Code, as part of the web-dev plugin only: runs the plugin's scripts/. Needs Node 22.22 or newer; the pipeline runs on GitHub Actions or GitLab CI."
allowed-tools: Bash(bash ${CLAUDE_SKILL_DIR}/scripts/setup-ci.sh *) Bash(bash ${CLAUDE_SKILL_DIR}/../../scripts/verify-project.sh *) Bash(pnpm install)
---

# ci-setup

Add one CI pipeline that installs the project from its lockfile and runs its whole unit-test suite, the `test` script, on every push. `scripts/setup-ci.sh` writes it, so the file is the same every time and is tested: the `node:24` image, `corepack enable` (corepack provides the pnpm or yarn that `package.json` pins), the package manager's frozen install, then `<pm> test`. Paths are relative to this skill's directory.

Run the scripts exactly as written below, each as one plain command: `allowed-tools` approves these exact forms, so the setup runs without a permission prompt, headless included.

## 1. Ask the host

Ask once, before anything else: should the pipeline run on GitHub (GitHub Actions) or GitLab (GitLab CI)? Skip the question only when the request already names one. Never pick the host from the git remotes or the CI files already in the folder: a mirror, an SSH alias or a leftover file points the wrong way, and a pipeline for the wrong host never runs and nothing reports it. Write nothing until the answer. A host other than these two (Bitbucket, Azure DevOps): say this version writes only GitHub Actions and GitLab CI, and stop.

## 2. Write the pipeline

`bash ${CLAUDE_SKILL_DIR}/scripts/setup-ci.sh <project-dir> github` or `... gitlab`. It writes `.github/workflows/unit-tests.yml` or `.gitlab-ci.yml` at the root of the git repository, since neither host reads a pipeline from a subfolder; when the project is a subfolder, the job runs there. Exit 0: written, go on to step 3. Exit 1 with `already exists`: show the pipeline the script printed and ask before changing the file; on a yes, add the job with Edit and leave the rest of the file as it is. Exit 1 otherwise (no `test` script, no lockfile, or bun): write nothing, run no install to make a lockfile, and stop, with the reason under **Blocked by**. Exit 2: stop and report the output.

Edit nothing else: the pipeline runs the suite as the project defines it. Lint, typecheck, build, caching or coverage reports are not part of it; when the user asked for them, list them under **Not done**.

## 3. Gates

The suite has to pass here, or the first pipeline starts red. A pnpm project without `node_modules` gets `pnpm install` first. Then run `bash ${CLAUDE_SKILL_DIR}/../../scripts/verify-project.sh <project-dir>`: in a project from the template it runs `pnpm check`, whose Prettier check covers the new YAML; elsewhere it runs the project's own lint, typecheck, test and build and names the ones it lacks. Report the real output. A failing test is not fixed here: report it under **Not done**, since the pipeline will fail on it too.

## 4. Hand over

The pipeline runs on the next push; this skill commits and pushes nothing. Tell the user:

- commit the new file and push; on GitLab, the job needs a runner with the Docker executor (GitLab.com's shared runners have one);
- a project that pins another Node (`engines.node`, `.nvmrc`) gets `node:24` all the same: name it under **Next**, as the one line to change;
- a branch rule (GitHub: required status check `unit-tests`; GitLab: "Pipelines must succeed") makes a red suite block the merge.

## Result

```
## Result
**Did:** the pipeline file and host, its install and test commands, and the gate outcome
**Saw:** facts observed: package manager, lockfile, the folder the job runs in, the real gate output
**Not done:** a failing test, a gate the project lacks, a job the user asked for that the pipeline leaves out
**Blocked by:** a missing `test` script or lockfile, the host question while unanswered, or "nothing"
**Next:** commit and push, the branch rule, a Node version to confirm
```
