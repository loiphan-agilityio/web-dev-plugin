#!/usr/bin/env node
// Measures a built single-page app (Vite's dist/) against size budgets, as JSON: what the first
// load downloads (index.html's scripts, stylesheets and modulepreloads, gzip-compressed as a CDN
// sends them) and the largest chunks loaded later (lazy routes).
//
//   node bundle-budget.mjs <dist> [--js <kB>] [--css <kB>] [--total <kB>] [--fail]
//
// Budgets are kB of gzip over the initial load; the defaults (JS 300, CSS 100, total 1500) are
// web-quality's (references/thresholds.md). Read-only. Exits 0 with the report, 1 with --fail when
// a budget is exceeded, 2 when it cannot measure (no index.html, a file index.html loads is not in
// <dist>, a bad option; the cause on stderr, nothing on stdout).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { cannotRun, isMain, printReport } from './lib/cli.mjs';

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
  // preloads for them; external URLs are not ours. A path is site-root relative, and a Vite `base`
  // other than / prefixes it (`/app/assets/x.js`): <dist> is that base, so leading folders are
  // dropped until the file is found. One never found stops the measurement, which would else count
  // it as 0 kB and pass.
  const refs = [
    ...new Set(
      [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)]
        .filter(([tag]) => /<script|rel=["']?(?:stylesheet|modulepreload)/i.test(tag))
        .map(([, ref]) => ref.split(/[?#]/)[0] ?? '')
        .filter((ref) => !/^([a-z]+:|\/\/)/i.test(ref)),
    ),
  ];
  const locate = (/** @type {string} */ ref) => {
    const parts = posix.normalize(ref).replace(/^\/+/, '').split('/');
    return parts.map((_, i) => parts.slice(i).join('/')).find((file) => existsSync(join(dist, file)));
  };
  const unfound = refs.filter((ref) => locate(ref) === undefined);
  if (unfound.length > 0) {
    throw new Error(`index.html loads ${unfound.join(', ')}, not found in ${dist}: measure the folder the site serves`);
  }
  const initialFiles = [...new Set(refs.map((ref) => locate(ref) ?? ''))];
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

const main = () => {
  const usage = 'bundle-budget.mjs <dist> [--js <kB>] [--css <kB>] [--total <kB>] [--fail]';
  /** @type {{ values: { js?: string, css?: string, total?: string, fail?: boolean }, positionals: string[] }} */
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        js: { type: 'string' },
        css: { type: 'string' },
        total: { type: 'string' },
        fail: { type: 'boolean' },
      },
    });
  } catch (error) {
    return cannotRun('bundle-budget', error, `usage: ${usage}`);
  }
  const { values, positionals } = args;
  const [dist] = positionals;
  if (!dist || !existsSync(dist) || !statSync(dist).isDirectory()) return cannotRun('usage', usage);
  try {
    const number = (/** @type {string | undefined} */ value) => {
      if (value === undefined) return undefined;
      const kb = Number(value);
      if (!Number.isFinite(kb) || kb <= 0) throw new Error(`a budget is a number of kB above 0, not ${value}`);
      return kb;
    };
    const report = bundleBudget(dist, { js: number(values.js), css: number(values.css), total: number(values.total) });
    printReport(report);
    if (values.fail && report.checks.some((check) => check.status === 'fail')) process.exitCode = 1;
  } catch (error) {
    cannotRun('bundle-budget', error);
  }
};

if (isMain(import.meta.url)) main();
