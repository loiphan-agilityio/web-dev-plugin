# claude-training

This branch (`web-development-skills`) holds the **web-app-skills** Claude Code plugin: four skills
that build web apps on the team stack (code skeleton, develop feature, integrate API, design to UI).

| Path | What it is |
|---|---|
| [`claude-skills/`](claude-skills/) | The plugin: skills, template, evals. Install and usage are in [`claude-skills/README.md`](claude-skills/README.md). |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | Marketplace that lists `claude-skills/` as the plugin `web-app-skills`. |
| [`.gitlab-ci.yml`](.gitlab-ci.yml) | Checks the plugin on merge requests, pushes and pipeline schedules. |

Quick install:

```bash
git clone -b web-development-skills git@gitlab.asoft-python.com:loi.phan/claude-training.git
claude plugin marketplace add ./claude-training
claude plugin install web-app-skills@claude-training
```
