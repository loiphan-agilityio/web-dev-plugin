# SEO for a client-rendered React 19 + Vite app

## Titles and descriptions per route

React 19 renders `<title>`, `<meta>` and `<link>` written inside a component into the document's
`<head>`, and removes them when the component unmounts. A page sets its own:

```tsx sketch
export const TodosPage = () => (
  <>
    <title>Todos · Acme</title>
    <meta name="description" content="Plan the day: add, filter and complete your todos." />
    <h1>Todos</h1>
    {/* … */}
  </>
);
```

Checked in a project created from the boilerplate (React 19.3, its production build under the
boilerplate's CSP): the page's `<title>`, description and canonical `<link>` moved into `<head>`,
React placed its `<title>` before the one in `index.html`, so `document.title` became the page's,
and after a client-side navigation to another route all three were removed and the title fell
back to `index.html`'s.

Keep a default `<title>` and `<meta name="description">` in `index.html` for the routes that set
none (and for crawlers that do not run JavaScript). In a project from the boilerplate the
generator names `<title>` after the project; the page title of each feature route goes in its page
component.

## robots.txt and sitemap.xml

Files in `public/` are copied to the root of `dist/` as they are:

```text sketch
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://www.example.com/sitemap.xml
```

```xml sketch
<!-- public/sitemap.xml: public routes only, absolute URLs -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.example.com/</loc></url>
  <url><loc>https://www.example.com/pricing</loc></url>
</urlset>
```

A host that serves `index.html` for every path (the boilerplate's `netlify.toml` does, for client
routing) still serves these files first, since a real file wins over the rewrite. Without them, the
same rewrite answers `/robots.txt` with `index.html` and 200 `text/html`: check the content type,
not the status.

A preview or staging deploy must not be indexed. `check-headers.mjs` reports its `X-Robots-Tag`
(`robots-header`); the boilerplate's Netlify draft deploys send none, so an indexer that finds a
draft URL may index it. Send `X-Robots-Tag: noindex` from those deploys (a host setting, or a
header the deploy step adds for previews only), never from a `robots.txt` that could reach
production.

## Canonical URLs

One URL per page: pick `https` and with or without `www`, redirect the others at the host, and
set `<link rel="canonical" href="https://www.example.com/todos">` on each page (React 19 hoists it
like `<title>`). Query parameters for tracking or sorting do not make a new page.

## Social cards

Link-preview bots read only the HTML, so they see `index.html`'s tags on every route. Put the
site's Open Graph and Twitter tags there (`og:title`, `og:description`, `og:image` as an absolute
URL to a 1200 × 630 image, `og:url`, `twitter:card`). Per-page previews need prerendered HTML.

## Structured data

JSON-LD describes the site or a page for rich results. A site-wide block (an `Organization` or
`WebSite`) can sit in `index.html` as `<script type="application/ld+json">`; it is data, not
executed script, and the boilerplate's `script-src 'self'` policy logged no violation for it. Validate it with Google's Rich Results Test on the deployed URL.

## When to prerender

Prerender (generate each route's HTML at build time) when a public page must rank on more than
Google, show its own link preview, or paint its main content without waiting for JavaScript.
Options: a build-time prerender of the public routes, or a framework with server rendering. It is
an architecture change: propose it with the pages it is for; do not add it during an audit.

Pages behind sign-in need none of this: give them a title per route and keep them out of the
sitemap.
