# web-quality: Claude Code plugin for measured web quality

One entry point, `/web-quality:audit`, and four skills that find what keeps a web page from being
fast, accessible, findable and safe, from evidence rather than rules of thumb: it measures the page
in a real browser and its build, keeps measured findings apart from hypotheses read in the code,
fixes them, and measures again. Built after
[addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills), tuned for
single-page apps on React 19 + Vite, and for projects from the
[react-vite-boilerplate](https://github.com/loiphan-agilityio/react-vite-boilerplate) in particular.

| Skill | Use it for | Example prompt |
|---|---|---|
| `audit` | The entry point: picks the pages, measures loading, bundle, headers, dependencies, accessibility and SEO, judges each finding (impact, and measured / config / hypothesis), writes one report and hands fixes to the skills below | "/web-quality:audit https://app.example.com" · "Is this app production ready?" |
| `performance` | Core Web Vitals (LCP, INP, CLS) in a real browser, the initial load against budgets, cause → fix → before/after | "Why is LCP 4 seconds on the home page?" |
| `accessibility` | axe in a Playwright test, keyboard and accessibility-tree checks against WCAG 2.2 AA, fixes with shadcn/Radix, a regression test | "Check this app for WCAG AA and fix what fails" |
| `seo` | Each route's title, description, canonical, robots, sitemap and social card; React 19 document metadata; when to prerender | "Add page titles and a sitemap" |
| `security` | Response headers and CSP on the real host, dependency advisories, risky frontend patterns (XSS sinks, open redirects, token storage, secrets in `VITE_*`) | "Add a Content Security Policy and check our headers" |

Thresholds (Core Web Vitals, bundle budgets, Lighthouse targets, WCAG AA) are in
`references/thresholds.md`.

## What it measures with

- **A browser tool that runs JavaScript in the page:** the Claude desktop app's browser, Claude in
  Chrome, or Chrome DevTools MCP. The skills read Core Web Vitals with `PerformanceObserver`
  (`skills/performance/references/measurement.md`) and the rendered `<head>` and accessibility tree.
  The tab must be visible while a page loads, or it records no paint.
- **`scripts/check-headers.mjs <url>`:** what the host really sends: HTTPS and HSTS, CSP (header or
  meta), nosniff, clickjacking, Referrer-Policy, caching of the HTML and hashed assets, the 404 of a
  gone asset, mixed content, `X-Robots-Tag`. JSON out, read-only.
- **`scripts/bundle-budget.mjs <dist>`:** kB of gzip over the initial load (entry, preloads,
  styles) against budgets, and the largest lazy chunks; `--fail` for CI.
- **The project's own tools:** `pnpm audit`, Playwright with `@axe-core/playwright`, and in a project
  from the boilerplate its lint (jsx-a11y), the Storybook a11y addon and `pnpm check`.

Lighthouse is optional: its scores join the report when it runs (Chrome DevTools MCP, or the
Lighthouse CLI run by the user); they never replace the measurements.

## Install

Requirements: Node ≥ 22, Claude Code. The repository root is a marketplace that lists this plugin
next to `web-dev`:

```bash
claude plugin marketplace add git@github.com:loiphan-agilityio/web-dev-plugin.git
```

```bash
claude plugin install web-quality@web-dev-plugin
```

Pin a release with `#web-quality--v<version>` on the marketplace URL. A git install is a cached
copy: a release reaches you when `version` in `.claude-plugin/plugin.json` changes and you run
`claude plugin update web-quality@web-dev-plugin` (or enable auto-update).

## Limits

- Lab numbers from one machine are not field data: the report says which it has.
- A page behind sign-in is measured only with the user's session already in the browser tool; the
  skills never type a password.
- The security skill reviews the frontend and the host's headers, not the backend, authentication
  or infrastructure; it is not a penetration test.
- Client-rendered pages show their per-route metadata only after JavaScript runs; the seo skill says
  when prerendering is needed and proposes it rather than adding it.
