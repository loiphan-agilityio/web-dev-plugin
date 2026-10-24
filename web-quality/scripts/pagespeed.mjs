#!/usr/bin/env node
// Runs PageSpeed Insights on a public URL, as JSON: the Lighthouse category scores of Google's lab
// run (performance, accessibility, best practices, SEO) and the field Core Web Vitals of real
// Chrome users (CrUX: LCP, INP, CLS at the 75th percentile), judged against
// references/thresholds.md.
//
//   node pagespeed.mjs <url> [--strategy mobile|desktop]
//
// PageSpeed Insights loads the page from Google's servers: it cannot reach localhost, a private
// network or a deploy behind a password. Without a key the API shares a small daily quota and often
// answers 429; set PAGESPEED_API_KEY (a Google Cloud API key, never printed) to use your own.
// PAGESPEED_API_URL replaces the API endpoint (the tests use a local server). Read-only: one GET to
// the API. Each check is { id, status: pass|fail|warn|info, detail }. Exits 0 with the report, 2
// when <url> is missing or not public, or the API cannot be reached or answers an error (the cause
// on stderr, nothing on stdout).
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/** @typedef {{ id: string, status: 'pass' | 'fail' | 'warn' | 'info', detail: string }} Check */

/**
 * Lighthouse targets from references/thresholds.md. Accessibility and SEO below target fail: their
 * audits are deterministic. Performance and best practices below target warn, and fail only in
 * Lighthouse's red band (under 50): one lab run varies.
 */
// `id` is the key under lighthouseResult.categories; `param` the request's `category` value, the
// enum of the API's discovery document (pagespeedonline v5: ACCESSIBILITY, BEST_PRACTICES, ...).
const CATEGORIES = [
  { id: 'performance', param: 'PERFORMANCE', target: 90, strict: false },
  { id: 'accessibility', param: 'ACCESSIBILITY', target: 100, strict: true },
  { id: 'best-practices', param: 'BEST_PRACTICES', target: 95, strict: false },
  { id: 'seo', param: 'SEO', target: 95, strict: true },
];

/**
 * Core Web Vitals (good, poor) from references/thresholds.md. The API reports CLS times 100.
 * @type {{ id: string, key: string, good: number, poor: number, format: (value: number) => string }[]}
 */
const VITALS = [
  { id: 'field-lcp', key: 'LARGEST_CONTENTFUL_PAINT_MS', good: 2500, poor: 4000, format: (ms) => `${ms / 1000} s` },
  { id: 'field-inp', key: 'INTERACTION_TO_NEXT_PAINT', good: 200, poor: 500, format: (ms) => `${ms} ms` },
  { id: 'field-cls', key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE', good: 10, poor: 25, format: (cls) => `${cls / 100}` },
];

/** @type {(hostname: string) => boolean} */
const isPrivateHost = (hostname) =>
  hostname === 'localhost' ||
  hostname.endsWith('.localhost') ||
  hostname.endsWith('.local') ||
  hostname === '[::1]' ||
  /^(127|10)\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

/** @type {(experience: any) => boolean} */
const hasMetrics = (experience) => Object.keys(experience?.metrics ?? {}).length > 0;

/**
 * @param {string} input
 * @param {{ strategy?: 'mobile' | 'desktop', apiUrl?: string, key?: string }} [options]
 */
export const pageSpeed = async (input, { strategy = 'mobile', apiUrl = API, key } = {}) => {
  const target = new URL(input);
  if (!/^https?:$/.test(target.protocol)) throw new Error(`${input} is not an http(s) URL`);
  if (isPrivateHost(target.hostname)) {
    throw new Error(`${target.hostname} is not public: PageSpeed Insights loads the page from Google's servers`);
  }

  const request = new URL(apiUrl);
  request.searchParams.set('url', target.href);
  // The discovery document's enum (MOBILE, DESKTOP), as for `category`.
  request.searchParams.set('strategy', strategy.toUpperCase());
  for (const { param } of CATEGORIES) request.searchParams.append('category', param);
  if (key) request.searchParams.set('key', key);

  // A run takes 10 to 60 seconds.
  const response = await fetch(request, { signal: AbortSignal.timeout(120_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message ?? response.statusText;
    const hint = response.status === 429 && !key ? ' (set PAGESPEED_API_KEY to use your own quota)' : '';
    throw new Error(`the API answered ${response.status}: ${message}${hint}`);
  }

  const lighthouse = body.lighthouseResult ?? {};
  /** @type {Check[]} */
  const checks = [];
  const add = (/** @type {Check} */ check) => checks.push(check);

  if (lighthouse.runtimeError?.code) {
    add({ id: 'lab', status: 'fail', detail: `Lighthouse could not load the page: ${lighthouse.runtimeError.message}` });
  }
  for (const { id, target: min, strict } of CATEGORIES) {
    const raw = lighthouse.categories?.[id]?.score;
    if (typeof raw !== 'number') {
      add({ id: `lab-${id}`, status: 'info', detail: 'no score in the response' });
      continue;
    }
    const score = Math.round(raw * 100);
    add({
      id: `lab-${id}`,
      status: score >= min ? 'pass' : strict || score < 50 ? 'fail' : 'warn',
      detail: `${score} (target ${min === 100 ? '100' : `≥ ${min}`}, ${strategy} lab)`,
    });
  }

  // URL-level field data when this URL has enough visits, else the whole origin's.
  const urlLevel = hasMetrics(body.loadingExperience) && !body.loadingExperience.origin_fallback;
  const experience = urlLevel ? body.loadingExperience : body.originLoadingExperience;
  const scope = urlLevel ? 'this URL' : 'the whole origin';
  if (!hasMetrics(experience)) {
    add({
      id: 'field-data',
      status: 'info',
      detail: 'no Chrome UX Report data for this URL or its origin (too few visits): judge by the lab values and the in-browser measurements',
    });
  } else {
    add({ id: 'field-data', status: 'info', detail: `Chrome UX Report, 75th percentile of the last 28 days, ${scope}` });
    for (const { id, key: metric, good, poor, format } of VITALS) {
      const value = experience.metrics[metric]?.percentile;
      if (typeof value !== 'number') {
        add({ id, status: 'info', detail: `no field value for ${metric}` });
        continue;
      }
      add({
        id,
        status: value <= good ? 'pass' : value <= poor ? 'warn' : 'fail',
        detail: `${format(value)} (good ≤ ${format(good)}, poor > ${format(poor)}; ${scope})`,
      });
    }
  }

  return {
    url: input,
    finalUrl: lighthouse.finalDisplayedUrl ?? lighthouse.finalUrl ?? target.href,
    strategy,
    fetchTime: lighthouse.fetchTime,
    checks,
  };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  /** @type {{ values: { strategy?: string }, positionals: string[] }} */
  let args;
  try {
    args = parseArgs({ allowPositionals: true, options: { strategy: { type: 'string', default: 'mobile' } } });
  } catch (error) {
    console.error(`pagespeed: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
  const [url] = args.positionals;
  const { strategy } = args.values;
  if (!url || (strategy !== 'mobile' && strategy !== 'desktop')) {
    console.error('usage: pagespeed.mjs <url> [--strategy mobile|desktop]');
    process.exit(2);
  }
  try {
    const report = await pageSpeed(url, {
      strategy,
      apiUrl: process.env.PAGESPEED_API_URL || API,
      key: process.env.PAGESPEED_API_KEY || undefined,
    });
    const count = (/** @type {Check['status']} */ status) =>
      report.checks.filter((check) => check.status === status).length;
    console.log(
      JSON.stringify(
        { ...report, summary: { pass: count('pass'), fail: count('fail'), warn: count('warn'), info: count('info') } },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(`pagespeed: ${url}: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
}
