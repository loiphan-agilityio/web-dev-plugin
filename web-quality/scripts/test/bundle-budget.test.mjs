import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { bundleBudget } from '../bundle-budget.mjs';

const cli = fileURLToPath(new URL('../bundle-budget.mjs', import.meta.url));

/** A dist/ like Vite's: index.html, its entry, a stylesheet, a preloaded chunk and a lazy one. */
const makeDist = (/** @type {number} */ entryBytes) => {
  const dist = mkdtempSync(join(tmpdir(), 'wq-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(
    join(dist, 'index.html'),
    [
      '<script type="module" crossorigin src="/assets/index-AAAA1111.js"></script>',
      '<link rel="modulepreload" crossorigin href="/assets/vendor-BBBB2222.js">',
      '<link rel="stylesheet" crossorigin href="/assets/index-CCCC3333.css">',
      '<link rel="icon" href="/vite.svg">',
      '<script src="https://cdn.example.com/x.js"></script>',
    ].join('\n'),
  );
  // Random bytes do not compress, so gzip size is close to the raw size.
  writeFileSync(join(dist, 'assets/index-AAAA1111.js'), randomBytes(entryBytes));
  writeFileSync(join(dist, 'assets/vendor-BBBB2222.js'), 'x'.repeat(50_000));
  writeFileSync(join(dist, 'assets/index-CCCC3333.css'), 'a{color:red}'.repeat(100));
  writeFileSync(join(dist, 'assets/lazy-DDDD4444.js'), randomBytes(20_000));
  return dist;
};

describe('bundle-budget', () => {
  /** @type {string[]} */
  const dirs = [];
  after(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  it('counts the entry, preloads and stylesheets as the initial load, the rest as lazy', () => {
    const dist = makeDist(10_000);
    dirs.push(dist);
    const report = bundleBudget(dist);
    assert.deepEqual(
      report.initial.files.map((file) => file.file),
      ['assets/index-AAAA1111.js', 'assets/vendor-BBBB2222.js', 'assets/index-CCCC3333.css'],
    );
    assert.equal(report.lazy.count, 1);
    assert.equal(report.lazy.largest[0].file, 'assets/lazy-DDDD4444.js');
    // 50 kB of one repeated byte gzips to almost nothing; the random entry does not.
    assert.ok(report.initial.jsGzipKB > 9 && report.initial.jsGzipKB < 12, String(report.initial.jsGzipKB));
    assert.ok(report.checks.every((check) => check.status === 'pass'));
  });

  it('fails the JS budget it exceeds, and the CLI exits 1 with --fail', () => {
    const dist = makeDist(40_000);
    dirs.push(dist);
    const report = bundleBudget(dist, { js: 30 });
    assert.equal(report.checks.find((check) => check.id === 'initial-js')?.status, 'fail');
    assert.equal(report.checks.find((check) => check.id === 'initial-css')?.status, 'pass');
    const run = spawnSync(process.execPath, [cli, dist, '--js', '30', '--fail'], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.equal(JSON.parse(run.stdout).budgetsKB.js, 30);
  });

  it('exits 2 for a folder without index.html', () => {
    const empty = mkdtempSync(join(tmpdir(), 'wq-empty-'));
    dirs.push(empty);
    const run = spawnSync(process.execPath, [cli, empty], { encoding: 'utf8' });
    assert.equal(run.status, 2);
    assert.equal(run.stdout, '');
    assert.match(run.stderr, /index\.html does not exist/);
  });
});
