# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and is tagged `web-quality--v<version>`.
A git install is a cached copy, so a change reaches users only with a new version.

## 0.1.0

First release.

- `audit`, the entry point (`/web-quality:audit`): target and scope, measurements per area, findings
  judged by impact and by how they are known (measured, config, hypothesis), one report, fixes routed
  to the skills below and measured again.
- `performance`: Core Web Vitals with `PerformanceObserver` in a real browser (LCP with its element,
  CLS, FCP, TTFB, INP on real interactions), bundle budgets, causes and fixes for a React + Vite app.
- `accessibility`: axe in a Playwright test, keyboard and accessibility-tree checks against
  WCAG 2.2 AA, fixes with shadcn/Radix components, regression tests.
- `seo`: per-route head checks, React 19 document metadata, robots.txt and sitemap.xml (and the SPA
  rewrite that hides a missing one), canonical URLs, social cards, when to prerender.
- `security`: headers and CSP on the real host, dependency advisories, risky frontend patterns.
- `scripts/check-headers.mjs` and `scripts/bundle-budget.mjs`: read-only, JSON out, with tests.
