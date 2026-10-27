# web-dev-plugin

[![CI](https://github.com/loiphan-agilityio/web-dev-plugin/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/loiphan-agilityio/web-dev-plugin/actions/workflows/ci.yml)
[![Node.js 22.22+](https://img.shields.io/badge/Node.js-22.22%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm 10+](https://img.shields.io/badge/pnpm-10%2B-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-D97757?logo=claude&logoColor=white)](https://docs.claude.com/en/docs/claude-code/overview)

Two Claude Code plugins for React web apps: **web-dev** builds tested code from one request,
**web-quality** measures what was built and fixes it.

| Plugin | What it does | Start with | Guide |
|---|---|---|---|
| **web-dev** | Scaffolds a project, builds features, endpoints and screens, sets up CI/CD, writes ticket, incident and PR contracts; every gate passes before it is done | `/web-dev:develop <request>` | [`web-dev/README.md`](web-dev/README.md) |
| **web-quality** | Audits speed, accessibility, SEO and security in a real browser, labels each finding measured or hypothesis, fixes it and measures again | `/web-quality:audit <url>` | [`web-quality/README.md`](web-quality/README.md) |

## Install

Needs Node 22.22+, pnpm 10+ and Claude Code.

```bash
claude plugin marketplace add git@github.com:loiphan-agilityio/web-dev-plugin.git
claude plugin install web-dev@web-dev-plugin
claude plugin install web-quality@web-dev-plugin  # optional
```

## Demo

```bash
mkdir -p examples/library-manager && cd examples/library-manager
claude "/web-dev:develop Build me a library management app. Librarians manage the book catalogue and the members, lend books to members and record returns, and need to see which loans are overdue."
```

One message, a whole app: `docs/plan.md`, every page with its API layer, mocks, tests and stories,
all six gates green, running on a mocked API (`pnpm dev:mock`). `examples/` is git-ignored.

## How it works

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/workflow-map/overview-dark.svg">
  <img alt="web-dev overview: /web-dev:develop scaffolds with project-setup and builds each ticket with feature-development, which hands endpoints to api-integration and designs to ui-development; ticket and incident write contracts first; build skills end on pnpm check, pr opens the pull request, and GitHub Actions deploys to Cloudflare Pages, connected by deploy-setup." src="docs/workflow-map/overview-light.svg">
</picture>

Every view of the map, with each card's details: [docs/workflow-map](docs/workflow-map/README.md).

## Repository

| Path | Contents |
|---|---|
| [`web-dev/`](web-dev/), [`web-quality/`](web-quality/) | The two plugins |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | The marketplace that lists them |
| [`docs/workflow-map/`](docs/workflow-map/) | The workflow map |
| [`spec.md`](spec.md), [`DESIGN.md`](DESIGN.md), [`CLAUDE.md`](CLAUDE.md) | Requirements, design, rules for changing the repository |
| [`tools/`](tools/), [`.github/workflows/`](.github/workflows/) | Maintainer scripts and CI |

## Contributing

Rules: [`CLAUDE.md`](CLAUDE.md). Steps and checks:
[`web-dev/README.md`](web-dev/README.md#contributing).
