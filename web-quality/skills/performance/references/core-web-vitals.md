# Core Web Vitals: causes and fixes in a React + Vite app

Find the cause from the measurement (`measurement.md`) before changing code: the LCP element, the
slow interaction's target, the shifting element. Each fix below says how to confirm it.

## LCP: the main content shows late

Split LCP into its parts: TTFB, then the time until the LCP resource starts loading, its download,
and the render delay after it.

- **Client rendering (the usual case in a SPA):** the HTML is an empty `#root`, so nothing paints
  until the JavaScript has downloaded, parsed and run. LCP ≈ FCP, far after TTFB.
  - Ship less JavaScript in the initial load (`bundle-budget.mjs`): move routes and heavy
    components to lazy chunks (React Router route `lazy`, `React.lazy` for a dialog or editor),
    drop or replace large dependencies (`vite build` lists every chunk's size).
  - Do not wait for data before the first paint when a shell can render: show the layout and a
    skeleton, then the data.
  - When LCP must be fast for search or marketing pages, prerender those routes to static HTML
    (a build-time prerender or a framework with server rendering); that is an architecture change,
    so propose it rather than doing it inside an audit.
- **TTFB over 0.8 s:** a cold serverless function, no CDN, redirects before the page. Static hosting
  (Netlify, a CDN) of `dist/` is fast; check redirects with `check-headers.mjs` (`finalUrl`).
- **LCP image:** give it `width`/`height`, `fetchpriority="high"`, no `loading="lazy"`; serve a size
  close to the displayed size (`srcset`/`sizes`) in AVIF or WebP. A hero image that CSS loads cannot
  be discovered early: use an `<img>`.
- **Web fonts:** the boilerplate self-hosts Geist with `@fontsource-variable/geist`, whose CSS sets
  `font-display: swap`, so text paints in a fallback font first. A font from another origin adds a
  connection on the critical path: self-host it the same way.
- **Confirm:** LCP of three loads before and after, same conditions.

## INP: the page reacts slowly

- **A long task on input:** a click that filters, sorts or renders a long list in one go. Render
  fewer rows (paginate or virtualize), move work out of render, and mark non-urgent updates with
  `useTransition` so typing and clicks stay responsive.
- **Re-rendering too much:** state high in the tree re-renders everything below it on each
  keystroke. Keep state close to where it is used; the React Compiler or `memo` helps only after
  the cause is known.
- **Third-party scripts** (analytics, chat, A/B tools) running on the main thread: load them after
  the page is interactive, or drop them.
- **Confirm:** the same interaction's duration before and after (`measurement.md`, INP).

## CLS: the layout jumps

- **Images and embeds without size:** set `width` and `height` (or `aspect-ratio`) so space is
  reserved before they load.
- **Content that arrives later** (data, a banner, a toast area): reserve its space. A skeleton must
  have the size of the content it stands for; a list that grows from 0 to 20 rows pushes the footer.
- **Web fonts:** a fallback font with very different metrics shifts text when the web font
  arrives; keep `font-display: swap` and size the fallback (`size-adjust`) if the shift is visible.
- **Animations:** animate `transform` and `opacity`, never `top`, `height` or `margin`.
- **Confirm:** `cls` after load and after scrolling, before and after.

## Caching and delivery

- Hashed files under `assets/` are safe to cache a year as `immutable`; `index.html` must
  revalidate (`max-age=0, must-revalidate`) so a deploy is seen at once. `check-headers.mjs` checks
  both. The boilerplate's `apps/web/netlify.toml` does this.
- A missing hashed file must be a 404, not `index.html` with 200: `check-headers.mjs`
  (`missing-asset`).
- Compression (gzip or Brotli) is the host's job; static hosts and CDNs do it. Check
  `content-encoding` on a JS response when sizes look raw.
