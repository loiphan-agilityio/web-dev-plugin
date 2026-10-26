---
name: seo
description: This skill should be used when the user asks to "improve SEO", "check meta tags", "add page titles", "make it show up on Google", "add a sitemap", "add Open Graph tags", "fix social previews" or "add structured data" in a web app, or when the web-quality audit routes an SEO finding here. It reads each route's rendered head, checks titles, descriptions, canonical URLs, robots and sitemap, and social cards, fixes them in a React 19 + Vite single-page app, and says when a page needs prerendering. Not for keyword research or content strategy.
compatibility: "Claude Code, as part of the web-quality plugin: reads the plugin's references/. Needs a browser tool to read the rendered head of each route."
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/check-headers.mjs *) Bash(node ${CLAUDE_SKILL_DIR}/../../scripts/pagespeed.mjs *) Bash(pnpm check)
---

# seo

Make every public page findable and correctly described in search results and link previews.
Thresholds: `../../references/thresholds.md`; the details for a client-rendered app:
`references/spa-seo.md`.

First decide which pages are public: a page behind sign-in is not indexed, and its SEO work is only
a title per route (for tabs, history and screen readers) and `noindex` where needed.

## 1. Check each public route

With the browser tool on the deployed site (or `vite preview` of `dist/`), for each route read:

```js
({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.content,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  robots: document.querySelector('meta[name="robots"]')?.content,
  h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  ogImage: document.querySelector('meta[property="og:image"]')?.content,
  lang: document.documentElement.lang,
});
```

Also fetch `/robots.txt` and `/sitemap.xml`: a single-page app's host answers an unknown path with
`index.html` and 200, so a missing file looks present. Its `content-type` must be `text/plain` and
`application/xml`, not `text/html`.

| Check | Good |
|---|---|
| `title` | unique per route, the page's subject first, about 50–60 characters |
| `description` | unique per route, about 150 characters, says what the page offers |
| `h1` | exactly one, matches the title's subject |
| `canonical` | absolute URL of the preferred version (no tracking parameters) |
| `robots` | absent or `index, follow` on public pages; `noindex` on private, search-result and staging pages |
| `lang` | the content's language |
| `og:title`, `og:description`, `og:image` | set on pages people share; the image absolute, about 1200 × 630 |

## 2. Know the limit of client rendering

`index.html` of a Vite SPA is the same for every route, and the route's metadata appears only after
the JavaScript runs. Google renders JavaScript, later than it crawls HTML; most link-preview bots
(chat apps, social networks) and many other crawlers do not run it at all and see the defaults in
`index.html`. See `references/spa-seo.md` for what follows from that and when to prerender.

## 3. Fix

Follow `references/spa-seo.md`: per-route titles and descriptions with React 19's document
metadata, `public/robots.txt` and `public/sitemap.xml`, a canonical URL, social cards in
`index.html` for the site and prerendering for the pages that need their own previews. In a project
from the boilerplate, `pnpm check` stays green after each change.

## 4. Confirm

Re-read each route's head with the same snippet, fetch `/robots.txt` and `/sitemap.xml` with their
content types, and validate structured data with Google's Rich Results Test (the user runs it on the
deployed URL). On a public URL, `node ${CLAUDE_SKILL_DIR}/../../scripts/pagespeed.mjs <url>` adds
Google's Lighthouse SEO score (`lab-seo`, target ≥ 95) as a regression guard, not as the check.

## Result

A table per route (title, description, canonical, h1, robots, social card) before → after, the
files changed, and what client rendering still limits (link previews per route) with the
prerendering option if those pages matter.
