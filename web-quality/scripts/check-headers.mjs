#!/usr/bin/env node
// Checks what a deployed (or `vite preview`) page actually sends, as JSON, so the security and
// performance skills report response headers from evidence instead of from config files: HTTPS
// and HSTS, the Content-Security-Policy (header or <meta>), clickjacking and MIME-sniffing
// protection, Referrer-Policy, caching of the HTML and of hashed assets, a missing asset's status
// (a single-page app must not answer index.html with 200 for it), and mixed content.
//
//   node check-headers.mjs <url>
//
// Read-only: GET requests to <url>, one same-origin asset it references and one asset path that
// does not exist. Each check is { id, status: pass|fail|warn|info, detail }. Exits 0 with the
// report, 2 when <url> is missing or cannot be fetched (the cause on stderr, nothing on stdout).
import { cannotRun, isMain, printReport } from './lib/cli.mjs';

const YEAR = 31_536_000;
const MISSING_ASSET = '/assets/__web-quality-missing__.js';

/** @typedef {import('./lib/cli.mjs').Check} Check */

/** @type {(cacheControl: string | null) => number | undefined} */
const maxAge = (cacheControl) => {
  const match = /(?:^|,)\s*max-age=(\d+)/i.exec(cacheControl ?? '');
  return match ? Number(match[1]) : undefined;
};

/** @type {(policy: string) => Map<string, string>} */
const directives = (policy) =>
  new Map(
    policy
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...values]) => [name.toLowerCase(), values.join(' ')]),
  );

/** @type {(html: string) => string | undefined} */
const metaPolicy = (html) =>
  /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/i
    .exec(html)?.[0]
    .match(/content=(["'])(.*?)\1/i)?.[2]
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"');

/** @type {(html: string, base: URL) => URL | undefined} */
const firstSameOriginAsset = (html, base) => {
  for (const [, ref] of html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi)) {
    const url = new URL(ref, base);
    if (url.origin === base.origin && /\.(js|css)$/.test(url.pathname)) return url;
  }
  return undefined;
};

/** @type {(policy: string | undefined, source: string) => Check[]} */
const cspChecks = (policy, source) => {
  if (!policy) {
    return [{ id: 'csp', status: 'fail', detail: 'no Content-Security-Policy header or <meta>' }];
  }
  const csp = directives(policy);
  const scripts = csp.get('script-src') ?? csp.get('default-src') ?? '';
  /** @type {Check[]} */
  const checks = [{ id: 'csp', status: 'pass', detail: `present (${source})` }];
  if (/'unsafe-inline'/.test(scripts) && !/'(nonce-|sha\d+-)/.test(scripts)) {
    checks.push({
      id: 'csp-script-inline',
      status: 'fail',
      detail: "script-src allows 'unsafe-inline' without a nonce or hash: no XSS protection",
    });
  }
  if (/'unsafe-eval'/.test(scripts)) {
    checks.push({ id: 'csp-script-eval', status: 'warn', detail: "script-src allows 'unsafe-eval'" });
  }
  // A directive missing from the policy falls back to default-src, as script-src does above.
  if ((csp.get('object-src') ?? csp.get('default-src')) !== "'none'") {
    checks.push({ id: 'csp-object-src', status: 'warn', detail: "no object-src 'none'" });
  }
  if (!csp.has('base-uri')) {
    checks.push({ id: 'csp-base-uri', status: 'warn', detail: 'no base-uri directive' });
  }
  return checks;
};

/** @type {(input: string) => Promise<{ url: string, finalUrl: string, status: number, checks: Check[] }>} */
export const checkHeaders = async (input) => {
  const page = await fetch(input, { redirect: 'follow' });
  const html = await page.text();
  const final = new URL(page.url);
  const headers = page.headers;
  const https = final.protocol === 'https:';
  /** @type {Check[]} */
  const checks = [];
  const add = (/** @type {Check} */ check) => checks.push(check);

  add(
    https
      ? { id: 'https', status: 'pass', detail: 'served over HTTPS' }
      : { id: 'https', status: 'warn', detail: `served over ${final.protocol} (fine locally only)` },
  );
  if (https) {
    const hsts = headers.get('strict-transport-security');
    add(
      hsts
        ? { id: 'hsts', status: 'pass', detail: hsts }
        : { id: 'hsts', status: 'warn', detail: 'no Strict-Transport-Security header' },
    );
  }

  const headerPolicy = headers.get('content-security-policy');
  const policy = headerPolicy ?? metaPolicy(html);
  for (const check of cspChecks(policy, headerPolicy ? 'header' : '<meta>')) add(check);
  if (headers.get('content-security-policy-report-only') && !policy) {
    add({ id: 'csp-report-only', status: 'info', detail: 'only a report-only policy is sent' });
  }

  add(
    headers.get('x-content-type-options')?.toLowerCase() === 'nosniff'
      ? { id: 'nosniff', status: 'pass', detail: 'X-Content-Type-Options: nosniff' }
      : { id: 'nosniff', status: 'fail', detail: 'no X-Content-Type-Options: nosniff' },
  );
  const frameOptions = headers.get('x-frame-options');
  const frameAncestors = headerPolicy ? directives(headerPolicy).get('frame-ancestors') : undefined;
  add(
    frameOptions || frameAncestors
      ? {
          id: 'clickjacking',
          status: 'pass',
          detail: frameAncestors ? `frame-ancestors ${frameAncestors}` : `X-Frame-Options: ${frameOptions}`,
        }
      : {
          id: 'clickjacking',
          status: 'fail',
          // frame-ancestors is ignored in a <meta> policy, so only a header protects.
          detail: 'no X-Frame-Options or CSP frame-ancestors header',
        },
  );
  const referrer = headers.get('referrer-policy');
  add(
    referrer
      ? { id: 'referrer-policy', status: 'pass', detail: referrer }
      : { id: 'referrer-policy', status: 'warn', detail: 'no Referrer-Policy header' },
  );
  const permissions = headers.get('permissions-policy');
  add(
    permissions
      ? { id: 'permissions-policy', status: 'pass', detail: permissions }
      : { id: 'permissions-policy', status: 'info', detail: 'no Permissions-Policy header' },
  );
  const robots = headers.get('x-robots-tag');
  add({
    id: 'robots-header',
    status: 'info',
    // Expected on preview and staging deploys (noindex), absent on production.
    detail: robots ? `X-Robots-Tag: ${robots}` : 'no X-Robots-Tag header (a preview deploy should send noindex)',
  });
  for (const name of ['server', 'x-powered-by']) {
    const value = headers.get(name);
    if (value && /\d/.test(value)) {
      add({ id: `${name}-version`, status: 'info', detail: `${name}: ${value} names a version` });
    }
  }

  const htmlCache = headers.get('cache-control');
  const htmlAge = maxAge(htmlCache);
  add(
    /immutable/i.test(htmlCache ?? '') || (htmlAge !== undefined && htmlAge > 600)
      ? { id: 'html-cache', status: 'fail', detail: `the HTML is cached long: ${htmlCache}` }
      : { id: 'html-cache', status: 'pass', detail: htmlCache ?? 'no Cache-Control' },
  );
  const asset = firstSameOriginAsset(html, final);
  if (asset) {
    const response = await fetch(asset);
    await response.arrayBuffer();
    const cache = response.headers.get('cache-control');
    const hashed = /[.-][A-Za-z0-9_-]{8,}\.(js|css)$/.test(asset.pathname);
    const long = (maxAge(cache) ?? 0) >= YEAR && /immutable/i.test(cache ?? '');
    add(
      !hashed
        ? { id: 'asset-cache', status: 'info', detail: `${asset.pathname} has no content hash` }
        : long
          ? { id: 'asset-cache', status: 'pass', detail: `${asset.pathname}: ${cache}` }
          : { id: 'asset-cache', status: 'warn', detail: `hashed ${asset.pathname} not cached a year as immutable: ${cache ?? 'none'}` },
    );
  }
  const missing = await fetch(new URL(MISSING_ASSET, final));
  await missing.arrayBuffer();
  const missingType = missing.headers.get('content-type') ?? '';
  add(
    missing.status === 404
      ? { id: 'missing-asset', status: 'pass', detail: `${MISSING_ASSET} answers 404` }
      : {
          id: 'missing-asset',
          status: missing.ok && missingType.includes('text/html') ? 'fail' : 'warn',
          detail: `${MISSING_ASSET} answers ${missing.status} ${missingType}: after a deploy, an old tab's import of a gone chunk gets this instead of a 404`,
        },
  );

  if (https) {
    const insecure = [...html.matchAll(/<(?:script|link|img|iframe|source)[^>]+(?:src|href)=["'](http:\/\/[^"']+)/gi)].map(
      ([, ref]) => ref,
    );
    add(
      insecure.length === 0
        ? { id: 'mixed-content', status: 'pass', detail: 'no http:// subresources in the HTML' }
        : { id: 'mixed-content', status: 'fail', detail: insecure.slice(0, 5).join(', ') },
    );
  }

  return { url: input, finalUrl: final.href, status: page.status, checks };
};

const main = async () => {
  const url = process.argv[2];
  if (!url) return cannotRun('usage', 'check-headers.mjs <url>');
  try {
    printReport(await checkHeaders(url));
  } catch (error) {
    cannotRun(`check-headers: ${url}`, error);
  }
};

if (isMain(import.meta.url)) await main();
