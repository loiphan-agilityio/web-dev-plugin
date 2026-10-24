# Measuring in a browser

Both snippets run in the page through a browser tool that evaluates JavaScript (the Claude desktop
browser's `javascript_tool`, Claude in Chrome, or Chrome DevTools MCP's `evaluate_script`). They use
only web platform APIs and were run against the boilerplate's Netlify deploy.

## Rules for a fair number

- **The tab must be visible while the page loads.** A page loaded in a hidden or background tab
  records no paint: no FCP and no LCP. Bring the browser to the front, then reload. The snippet
  below reports `hiddenAtLoad`; when it is `true`, the run does not count.
- **Load once to warm up, then measure three loads** and report the median. One load is noise.
- **Same conditions before and after a fix:** same URL, build, browser window size and network.
- **Say what it is:** lab, desktop or mobile emulation, which machine. A developer laptop on Wi-Fi
  is much faster than the 75th-percentile phone; treat a lab LCP near 2.5 s as a fail on mobile.
- Prefer a deployed build (real compression, CDN, headers) or `vite preview` of `dist/` over
  `vite dev`, which serves unbundled modules and is not representative.
- A mock build (MSW in the browser) needs a service worker. The Claude desktop browser refused to
  register one in our runs, so the app ran without mocks there and its data screens showed their
  error state: measure such a build in Chrome, or say that the data screens were not measured.

## Load metrics: LCP, CLS, FCP, TTFB

Reload the page, wait for it to settle, then run:

```js
await new Promise((resolve) => {
  const result = {
    visibility: document.visibilityState,
    hiddenAtLoad: performance.getEntriesByType('visibility-state').some((e) => e.name === 'hidden'),
  };
  new PerformanceObserver((list) => {
    const last = list.getEntries().at(-1);
    result.lcp = { ms: Math.round(last.startTime), element: last.element?.tagName.toLowerCase(), url: last.url || undefined };
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  let cls = 0;
  new PerformanceObserver((list) => {
    for (const shift of list.getEntries()) if (!shift.hadRecentInput) cls += shift.value;
    result.cls = Number(cls.toFixed(3));
  }).observe({ type: 'layout-shift', buffered: true });
  const [navigation] = performance.getEntriesByType('navigation');
  result.ttfbMs = Math.round(navigation.responseStart);
  result.fcpMs = Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1);
  setTimeout(() => resolve({ cls: 0, ...result }), 1000);
});
```

On the boilerplate's home page (desktop, lab): `{ lcp: { ms: 1480, element: 'h1' }, fcpMs: 1480,
ttfbMs: 283, cls: 0 }`. `lcp.element` and `lcp.url` say what to optimize: an `img` URL is an image to
size and prioritize, a text element waits on fonts or JavaScript. LCP equal to FCP and far after
TTFB is the signature of client rendering: nothing paints until the bundle has run.

CLS keeps growing after load (late images, banners, fonts); for a page with a long session, scroll
and wait, then read `cls` again.

## Responsiveness: INP

INP needs real interactions. Start the observer, interact (click the main buttons, type in a
field, open a menu) with the browser tool, then read the result:

```js
window.__webQualityInp = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId) window.__webQualityInp.push({ name: entry.name, ms: Math.round(entry.duration), target: entry.target?.tagName.toLowerCase() });
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 });
```

```js
({ interactions: window.__webQualityInp, worstMs: Math.max(0, ...window.__webQualityInp.map((e) => e.ms)) });
```

With fewer than 50 interactions, INP is the worst one. Durations are rounded to 8 ms and only
events of 16 ms or more are recorded, so an empty list means every interaction was fast. Name the
slow `target` and what the interaction did (open a dialog, filter a list).

## Field data

The Chrome UX Report has the 75th percentile of real Chrome users for sites with enough traffic
(PageSpeed Insights shows it, as does a current DevTools trace). Quote field values when they
exist, and say so when they do not: a new app has none.

## Network and resources

`performance.getEntriesByType('resource')` lists every request with `transferSize`,
`initiatorType` and timings; the network panel of the browser tool shows the same. Look for:
requests before the LCP element that it does not need, images larger than they are shown, a font
or script from another origin on the critical path, and repeated requests a cache should serve.
