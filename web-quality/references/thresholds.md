# Thresholds

Every web-quality skill reports against these numbers. A number from one page load on the
developer's machine is a **lab** value: it locates a problem and proves a fix, but it is not what
users get. **Field** values are the 75th percentile of real visits (Chrome UX Report, or the
app's own RUM); only they decide whether a site passes Core Web Vitals.

## Core Web Vitals and loading

| Metric | Good | Needs improvement | Poor | What it measures |
|---|---|---|---|---|
| LCP, Largest Contentful Paint | ≤ 2.5 s | ≤ 4 s | > 4 s | when the main content is visible |
| INP, Interaction to Next Paint | ≤ 200 ms | ≤ 500 ms | > 500 ms | how fast the page reacts to input |
| CLS, Cumulative Layout Shift | ≤ 0.1 | ≤ 0.25 | > 0.25 | how much the layout jumps |
| FCP, First Contentful Paint | ≤ 1.8 s | ≤ 3 s | > 3 s | first text or image (diagnostic) |
| TTFB, Time to First Byte | ≤ 0.8 s | ≤ 1.8 s | > 1.8 s | server and network (diagnostic) |

LCP, INP and CLS are the Core Web Vitals; FCP and TTFB explain a slow LCP. A desktop lab run on a
fast machine and network is far kinder than a mid-range phone on 4G: when only a desktop lab number
is available, say so next to it.

## Bundle budgets

Measured by `scripts/bundle-budget.mjs`: kB of **gzip** over what the first load downloads
(index.html's entry scripts, modulepreloads and stylesheets).

| Budget | Default | Why |
|---|---|---|
| Initial JavaScript | 300 kB | parse and execute time on a phone delays LCP and INP |
| Initial CSS | 100 kB | render-blocking |
| Initial total | 1500 kB | download on a slow connection |

A route the user may never open belongs in a lazy chunk, not in the initial load. Tighten the
budgets for a content site; a team may set its own with the script's flags.

## Lighthouse scores

| Category | Target |
|---|---|
| Performance | ≥ 90 (mobile) |
| Accessibility | 100, then the manual checks: automated tools find only part of WCAG |
| Best Practices | ≥ 95 |
| SEO | ≥ 95 |

A score is a regression guard, not proof: 100 in Accessibility does not mean accessible, and a high
Best Practices score is not a security review.

## Accessibility

WCAG 2.2 level AA: contrast 4.5:1 for normal text and 3:1 for large text and for UI parts, every
function reachable by keyboard with a visible focus, targets at least 24 × 24 CSS px, content that
reflows at 320 CSS px wide and stays usable at 200% zoom.
