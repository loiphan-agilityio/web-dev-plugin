#!/usr/bin/env node
// Measures a built single-page app (Vite's dist/) against size budgets, as JSON: what the first
// load downloads (index.html's scripts, stylesheets and modulepreloads, gzip-compressed as a CDN
// sends them) and the largest chunks loaded later (lazy routes).
//
//   node bundle-budget.mjs <dist> [--js <kB>] [--css <kB>] [--total <kB>] [--fail]
//
// Budgets are kB of gzip over the initial load; the defaults (JS 300, CSS 100, total 1500) are
// web-quality's (references/thresholds.md). Read-only. Exits 0 with the report, 1 with --fail when
// a budget is exceeded, 2 when <dist> has no index.html (the cause on stderr, nothing on stdout).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/** @typedef {{ file: string, bytes: number, gzip: number }} Asset */

const kB = (/** @type {number} */ bytes) => Math.round((bytes / 1024) * 10) / 10;

/** @type {(dist: string, file: string) => Asset} */
const measure = (dist, file) => {
  const content = readFileSync(join(dist, file));
  return { file, bytes: content.length, gzip: gzipSync(content).length };
};

/** @type {(dir: string) => string[]} */
const filesUnder = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

/**
 * @param {string} distDir
 * @param {{ js?: number, css?: number, total?: number }} [budgets] kB of gzip
 */
export const bundleBudget = (distDir, { js = 300, css = 100, total = 1500 } = {}) => {
  const dist = resolve(distDir);
  const index = join(dist, 'index.html');
  if (!existsSync(index)) throw new Error(`${index} does not exist: build the app first`);
  const html = readFileSync(index, 'utf8');
  // What the browser fetches before the app runs: entry scripts, stylesheets and the chunks Vite
  // preloads for them. Absolute paths are site-root relative; external URLs are not ours.
  const initialFiles = [
    ...new Set(
      [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)]
        .filter(([tag]) => /<script|rel=["']?(?:stylesheet|modulepreload)/i.test(tag))
        .map(([, ref]) => ref.replace(/^\//, '').split(/[?#]/)[0])
        .filter((ref) => !/^[a-z]+:/i.test(ref) && existsSync(join(dist, ref))),
    ),
  ];
  const initial = initialFiles.map((file) => measure(dist, file));
  const sum = (/** @type {Asset[]} */ assets) => assets.reduce((all, asset) => all + asset.gzip, 0);
  const initialJs = initial.filter((asset) => asset.file.endsWith('.js'));
  const initialCss = initial.filter((asset) => asset.file.endsWith('.css'));
  const lazy = filesUnder(dist)
    .map((path) => relative(dist, path).replaceAll('\\', '/'))
    .filter((file) => file.endsWith('.js') && !initialFiles.includes(file))
    .map((file) => measure(dist, file))
    .sort((a, b) => b.gzip - a.gzip);

  const totals = { js: sum(initialJs), css: sum(initialCss), total: sum(initial) };
  const checks = /** @type {const} */ (['js', 'css', 'total']).map((kind) => {
    const budget = { js, css, total }[kind];
    return {
      id: `initial-${kind}`,
      status: kB(totals[kind]) <= budget ? 'pass' : 'fail',
      detail: `${kB(totals[kind])} kB gzip of ${budget} kB`,
    };
  });
  const describe = (/** @type {Asset} */ asset) => ({ file: asset.file, kB: kB(asset.bytes), gzipKB: kB(asset.gzip) });
  return {
    dist,
    budgetsKB: { js, css, total },
    initial: { jsGzipKB: kB(totals.js), cssGzipKB: kB(totals.css), totalGzipKB: kB(totals.total), files: initial.map(describe) },
    lazy: { count: lazy.length, largest: lazy.slice(0, 5).map(describe) },
    checks,
  };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      js: { type: 'string' },
      css: { type: 'string' },
      total: { type: 'string' },
      fail: { type: 'boolean' },
    },
  });
  const [dist] = positionals;
  if (!dist || !existsSync(dist) || !statSync(dist).isDirectory()) {
    console.error('usage: bundle-budget.mjs <dist> [--js <kB>] [--css <kB>] [--total <kB>] [--fail]');
    process.exit(2);
  }
  try {
    const number = (/** @type {string | undefined} */ value) => (value === undefined ? undefined : Number(value));
    const report = bundleBudget(dist, { js: number(values.js), css: number(values.css), total: number(values.total) });
    console.log(JSON.stringify(report, null, 2));
    if (values.fail && report.checks.some((check) => check.status === 'fail')) process.exit(1);
  } catch (error) {
    console.error(`bundle-budget: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
}
