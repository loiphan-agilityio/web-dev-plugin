---
name: audit
description: This skill should be used when the user types "/web-quality:audit", asks to "audit my site", "check web quality", "run a Lighthouse-style review", "is my app production ready", "check performance, accessibility and SEO" or "why is my page slow" for a web page or single-page app, deployed or local. It measures the page in a real browser and its build (Core Web Vitals, bundle budgets, response headers, accessibility, SEO), reports measured findings apart from hypotheses, and routes fixes to the performance, accessibility, seo and security skills. Not for writing a new feature (web-dev) or a backend-only review.
compatibility: "Claude Code, as part of the web-quality plugin: reads the plugin's references/ and scripts/. Needs Node 22 or newer; the live measurements need a browser tool that can run JavaScript in a page (the Claude desktop browser, Claude in Chrome or Chrome DevTools MCP)."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs *) Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/bundle-budget.mjs *) Bash(pnpm build) Bash(pnpm build:mock) Bash(pnpm audit) Bash(pnpm audit --prod)
---

# audit

Find what keeps a web page from being fast, accessible, findable and safe, from evidence. A score or
a code smell is a lead, not a finding: measure first, read the code where the measurement points,
and say which findings were measured and which are only read from the source.

Read `../../references/thresholds.md` first: every number below is judged against it.

## 1. Target and scope

- **A URL** (production, a preview deploy): measure it directly. Production gives the real headers
  and caching; a preview deploy is the place to check a fix before it ships.
- **A local project:** build it as it ships (`pnpm build`; a project from the boilerplate that still
  runs on mocks ships `pnpm build:mock`) and serve `dist/` (`pnpm --filter web preview --port 4173
  --strictPort`, through the browser tool's preview or by the user). `vite preview` does not apply
  the hosting's headers (`netlify.toml`), so check headers on a deployed URL, and without one read
  the hosting config and mark those findings **config**.
- **Scope:** the pages that matter (home, the main flow, one data page), mobile first. A page behind
  sign-in needs the user's session in the browser tool; never type their password.

## 2. Measure

Run what is available; a missing tool narrows the report, it does not stop it. Name what was not
measured under **Not checked**.

| Area | Evidence | How |
|---|---|---|
| Loading, Core Web Vitals | LCP, CLS, FCP, TTFB, INP of a real load and interaction | `performance` skill, `references/measurement.md` (in-page `PerformanceObserver`; the tab must be visible) |
| Bundle | initial JS, CSS and total kB gzip vs budget, largest lazy chunks | `node ${CLAUDE_SKILL_DIR}/../../scripts/bundle-budget.mjs <dist>` |
| Headers, caching, HTTPS | CSP, nosniff, clickjacking, Referrer-Policy, HSTS, cache of HTML and hashed assets, 404 for a gone asset, mixed content | `node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs <url>` |
| Dependencies | known vulnerabilities | `pnpm audit --prod` (or the project's package manager) |
| Accessibility | automated rules, keyboard, focus, names, contrast | `accessibility` skill: axe in the browser or a Playwright spec, then the manual checks |
| SEO | title, description, canonical, robots, sitemap, social cards per route | `seo` skill: read the rendered `<head>` of each page |

With Lighthouse available (Chrome DevTools MCP's `lighthouse_audit`, or the Lighthouse CLI the user
runs), add its scores to the report; they do not replace the checks above.

## 3. Judge

Sort every finding by impact, then label how it is known:

- **measured**: seen in this run (a number, a header, an axe violation, a failing key press);
- **config**: read from configuration that decides runtime behaviour (hosting headers, CSP source);
- **hypothesis**: read from code only. Say how to confirm it.

Impact: **blocker** (fails a Core Web Vital as Poor, a WCAG A failure that blocks a task, an
exploitable security gap), **high** (Needs improvement, a WCAG AA failure, a missing protection
header), **medium**, **low**. Keep style preferences out.

## 4. Report

```markdown sketch
## Web quality: <target> (<date>, <mobile|desktop>, lab)

| Area | Result | Target | Status |
|---|---|---|---|
| LCP | 1.5 s (h1) | ≤ 2.5 s | good |
| Initial JS | 158 kB gzip | ≤ 300 kB | pass |
| Headers | 11 pass, 0 fail | all pass | pass |

### Findings
1. **[high, measured]** <what, where, the evidence> → <fix, which skill>
2. **[medium, hypothesis]** <what> → <how to confirm>

### Not checked
- <area>: <why (no browser tool, page behind sign-in, no deployed URL)>
```

## 5. Fix and re-measure

Fix with the matching skill (`performance`, `accessibility`, `seo`, `security`): each says how to
fix its findings in a React + Vite app and how to confirm. Re-run the same measurement after the
fix and put before → after in the report. In a project from the boilerplate, `pnpm check` must stay
green after every fix.
