# Changelog

Each release bumps `version` in `.claude-plugin/plugin.json` and is tagged `web-quality--v<version>`.
A git install is a cached copy, so a change reaches users only with a new version.

## 0.2.1

- `spa-seo.md`: the boilerplate's Netlify drafts now send `X-Robots-Tag: noindex` (its CI adds a
  `_headers` file to the draft's copy of the build; observed on a draft and on the live site), and
  how to do the same.

## 0.2.0

- `scripts/pagespeed.mjs <url> [--strategy mobile|desktop]`: PageSpeed Insights v5 as JSON, the
  Lighthouse category scores of Google's lab run against `references/thresholds.md` (Accessibility
  and SEO fail under target, Performance and Best Practices warn, and fail under 50) and the field
  LCP, INP and CLS at the 75th percentile, from the URL or, with too few visits, its origin. It
  refuses localhost and private addresses, reads an optional `PAGESPEED_API_KEY` (never printed;
  the keyless quota is shared and was spent when this was written: 429) and exits 2 on an API
  error. Tests against a local fake API.
- `audit`: a landing page checklist (axe, keyboard, Lighthouse, PageSpeed Insights, SEO head,
  bundle) with the boilerplate's `accessibility.spec.ts` and its CI `lighthouse` job; PageSpeed in
  the measurements table. `performance` and `seo` run `pagespeed.mjs` for field data and the SEO
  score.
- Routing eval `07-landing-checklist` (maintainers only).

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
