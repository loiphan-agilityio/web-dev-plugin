---
name: performance
description: This skill should be used when the user asks to "make the page faster", "fix LCP", "improve INP", "reduce layout shift", "check Core Web Vitals", "reduce the bundle size", "the app loads slowly" or "set a performance budget" in a web app, or when the web-quality audit routes a loading or responsiveness finding here. It measures Core Web Vitals in a real browser and the build's initial load against budgets, finds the cause, fixes it in a React + Vite app and re-measures. Not for backend or database performance.
compatibility: "Claude Code, as part of the web-quality plugin: reads the plugin's references/ and scripts/. Needs Node 22 or newer and a browser tool that can run JavaScript in a page for the live metrics."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/bundle-budget.mjs *) Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs *) Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/pagespeed.mjs *) Bash(pnpm build) Bash(pnpm --filter web build:mock) Bash(pnpm check)
---

# performance

Make the page load and respond fast for real users, proven by numbers before and after.
Thresholds: `../../references/thresholds.md`.

## 1. Measure

1. **Build as it ships** (`pnpm build`, or, from the root of a project from the boilerplate that
   still runs on mocks, `pnpm --filter web build:mock`) and check the initial load:
   `node ${CLAUDE_SKILL_DIR}/../../scripts/bundle-budget.mjs apps/web/dist` (or the app's `dist/`).
   Over budget, or one entry chunk holding every route: start there.
2. **Load metrics in a browser** on a deployed URL or `vite preview` of `dist/`, never `vite dev`:
   follow `references/measurement.md` (LCP with its element, CLS, FCP, TTFB; three loads, visible
   tab).
3. **Responsiveness:** INP on the page's main interactions (`references/measurement.md`, INP).
4. **Delivery:** `node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs <url>` for caching of the
   HTML and hashed assets and the 404 of a gone asset.
5. **Field data** on a public URL: `node ${CLAUDE_SKILL_DIR}/../../scripts/pagespeed.mjs <url>`
   (PageSpeed Insights: real users' LCP, INP and CLS at the 75th percentile when the Chrome UX
   Report has them, and Google's lab run). It cannot reach localhost or a deploy behind a password;
   a 429 means the shared quota is spent and `PAGESPEED_API_KEY` is needed.

## 2. Find the cause

Use the evidence to pick the section of `references/core-web-vitals.md`: the LCP element and its
breakdown, the slow interaction's target, the shifting element, the chunk that fills the budget.
Read the code those point at; do not optimize what was not measured.

## 3. Fix

- One change at a time, the one with the largest measured gain first.
- Prefer removing work (less JavaScript, fewer requests, smaller images) over adding machinery.
- Route-level splitting: a route the user may never open goes behind React Router's `lazy`; in a
  project from the boilerplate, routes are built in `src/app/routes.tsx` and features add theirs from
  `src/features/<name>/routes.tsx`.
- Keep behaviour: in a project from the boilerplate, `pnpm check` (lint, typecheck, tests, build,
  Storybook, e2e) stays green after each fix.

## 4. Confirm

Re-run the same measurement under the same conditions and report before → after: the metric, the
budget line, the number of loads. A change that does not move the number is reverted or reported
as no gain.

## Result

```markdown sketch
### Performance: <page> (lab, <desktop|mobile>, median of 3)
| Metric | Before | After | Target |
|---|---|---|---|
| LCP | 2.9 s (img.hero) | 1.8 s | ≤ 2.5 s |
| Initial JS | 412 kB gzip | 231 kB | ≤ 300 kB |
Changes: <file: what and why>. Not measured: <INP on the checkout flow (needs sign-in)>.
```
