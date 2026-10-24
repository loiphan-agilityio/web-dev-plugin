# Response headers and Content-Security-Policy

## What a page should send

| Header | Value | Protects against |
|---|---|---|
| `Content-Security-Policy` | scripts from `'self'` only, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | injected scripts (XSS), plugin content, base-tag and form hijacking |
| `X-Content-Type-Options` | `nosniff` | a file run as a script or style it is not |
| `X-Frame-Options` or CSP `frame-ancestors` | `DENY`/`SAMEORIGIN`, or `'none'`/`'self'` | clickjacking in a foreign frame |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | full URLs (with ids or tokens) leaking to other sites |
| `Permissions-Policy` | the powerful features the app does not use turned off | a compromised script using camera, microphone, location |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` once every subdomain serves HTTPS | downgrade to HTTP |

`check-headers.mjs` checks each on a URL. Netlify sent HSTS on the boilerplate's `*.netlify.app`
deploy without any configuration; check a custom domain with the script rather than assuming.

## The boilerplate's setup (verified on its Netlify deploy)

`apps/web/netlify.toml` sends the protection headers on every response. The Storybook site deploys
with the same file, so the values suit both (SAMEORIGIN, since Storybook frames its own pages):

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=()"
```

The Content-Security-Policy is a `<meta>` tag that a small Vite plugin in `apps/web/vite.config.ts`
adds to the built `index.html` only (`pnpm dev` needs an inline React Refresh script, and Storybook
needs inline scripts). Its e2e test `e2e/home.spec.ts` ("runs under its Content-Security-Policy")
fails on any violation in the console. To change the policy, edit the list in `vite.config.ts`;
the one change every real project needs is narrowing `connect-src` from `https:` to the API's
origin.

## CSP as a meta tag or a header

A `<meta http-equiv="Content-Security-Policy">` is enough for script, style, image, font and
connect rules, but browsers ignore `frame-ancestors`, `report-uri` and `sandbox` in it: send those
as a header (or keep `X-Frame-Options`). A header applies to every response, including the
Storybook site when both share a host config; that is why the boilerplate uses the meta tag.

## Writing a policy

- Start from `default-src 'self'` and add only what the app loads: an analytics origin in
  `script-src` and `connect-src`, an image CDN in `img-src`.
- `script-src` without `'unsafe-inline'` and `'unsafe-eval'`. A Vite production build needs neither;
  a library that does (`eval`, `new Function`) is a finding of its own.
- `style-src 'self' 'unsafe-inline'` is often needed (component libraries insert `<style>` tags:
  sonner does); it is far less risky than inline scripts.
- Roll out a stricter policy as `Content-Security-Policy-Report-Only` first (a header) and watch the
  console or a report endpoint before enforcing it.
- Confirm in the browser: load every page and the main flows with the console open; a violation
  logs "Refused to … because it violates the following Content Security Policy directive".
