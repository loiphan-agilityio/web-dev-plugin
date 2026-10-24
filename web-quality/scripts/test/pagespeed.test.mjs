import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { pageSpeed } from '../pagespeed.mjs';

const script = fileURLToPath(new URL('../pagespeed.mjs', import.meta.url));

/** A v5 runPagespeed response (fields as the API names them; CLS percentile times 100). */
const response = ({ scores = {}, field, originField, fallback = false } = {}) => ({
  lighthouseResult: {
    finalDisplayedUrl: 'https://www.example.com/',
    fetchTime: '2026-10-24T00:00:00.000Z',
    categories: Object.fromEntries(
      Object.entries({ performance: 0.95, accessibility: 1, 'best-practices': 1, seo: 1, ...scores }).map(
        ([id, score]) => [id, { id, score }],
      ),
    ),
  },
  loadingExperience: field ? { metrics: field, origin_fallback: fallback || undefined } : {},
  originLoadingExperience: originField ? { metrics: originField } : {},
});

const vitals = (lcp, inp, cls) => ({
  LARGEST_CONTENTFUL_PAINT_MS: { percentile: lcp, category: 'FAST' },
  INTERACTION_TO_NEXT_PAINT: { percentile: inp, category: 'FAST' },
  CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: cls, category: 'FAST' },
});

/** @type {(report: Awaited<ReturnType<typeof pageSpeed>>) => Record<string, string>} */
const statuses = (report) => Object.fromEntries(report.checks.map((check) => [check.id, check.status]));

describe('pagespeed', () => {
  /** The fake API answers with `next`, and records the last request's query. */
  let next = { status: 200, body: {} };
  /** @type {URLSearchParams | undefined} */
  let lastQuery;
  /** @type {import('node:http').Server} */
  let server;
  let apiUrl = '';

  before(async () => {
    server = createServer((request, res) => {
      lastQuery = new URL(request.url ?? '/', 'http://x').searchParams;
      res.statusCode = next.status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(next.body));
    });
    await new Promise((resolve) => server.listen(0, () => resolve(undefined)));
    const address = /** @type {import('node:net').AddressInfo} */ (server.address());
    apiUrl = `http://127.0.0.1:${address.port}/runPagespeed`;
  });
  after(() => server.close());

  /** @type {(body: object, strategy?: 'mobile' | 'desktop') => ReturnType<typeof pageSpeed>} */
  const run = (body, strategy) => {
    next = { status: 200, body };
    return pageSpeed('https://www.example.com/', { apiUrl, strategy, key: 'test-key' });
  };

  it('asks for the four categories on mobile and passes a page that meets every target', async () => {
    const report = await run(response({ field: vitals(1800, 120, 5) }));
    const got = statuses(report);
    // The enum values of the API's discovery document, not the response's lowercase keys.
    assert.deepEqual(lastQuery?.getAll('category'), ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']);
    assert.equal(lastQuery?.get('strategy'), 'MOBILE');
    assert.equal(lastQuery?.get('url'), 'https://www.example.com/');
    for (const id of ['lab-performance', 'lab-accessibility', 'lab-best-practices', 'lab-seo', 'field-lcp', 'field-inp', 'field-cls']) {
      assert.equal(got[id], 'pass', id);
    }
    assert.match(report.checks.find((check) => check.id === 'field-cls')?.detail ?? '', /^0\.05 /);
    assert.match(report.checks.find((check) => check.id === 'field-data')?.detail ?? '', /this URL/);
  });

  it('fails accessibility and SEO under target, warns on performance under 90 and fails it under 50', async () => {
    const got = statuses(await run(response({ scores: { accessibility: 0.98, seo: 0.92, performance: 0.7, 'best-practices': 0.4 } })));
    assert.equal(got['lab-accessibility'], 'fail');
    assert.equal(got['lab-seo'], 'fail');
    assert.equal(got['lab-performance'], 'warn');
    assert.equal(got['lab-best-practices'], 'fail');
  });

  it('judges each field vital as good, needs improvement or poor', async () => {
    const got = statuses(await run(response({ field: vitals(4200, 300, 30) })));
    assert.equal(got['field-lcp'], 'fail');
    assert.equal(got['field-inp'], 'warn');
    assert.equal(got['field-cls'], 'fail');
  });

  it('uses the origin when the URL has no field data of its own, and says so', async () => {
    const report = await run(response({ field: vitals(1000, 50, 1), fallback: true, originField: vitals(3000, 100, 2) }));
    assert.equal(statuses(report)['field-lcp'], 'warn');
    assert.match(report.checks.find((check) => check.id === 'field-lcp')?.detail ?? '', /whole origin/);
  });

  it('reports no field data as info, without vitals', async () => {
    const got = statuses(await run(response({})));
    assert.equal(got['field-data'], 'info');
    assert.equal(got['field-lcp'], undefined);
  });

  it('refuses localhost and private addresses before calling the API', async () => {
    lastQuery = undefined;
    for (const url of ['http://localhost:4173/', 'http://127.0.0.1/', 'http://192.168.1.5/', 'file:///tmp/index.html']) {
      await assert.rejects(pageSpeed(url, { apiUrl }));
    }
    assert.equal(lastQuery, undefined);
  });

  /** @type {(args: string[], env?: Record<string, string>) => ReturnType<typeof spawnSync>} */
  const cli = (args, env = {}) =>
    spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      env: { ...process.env, PAGESPEED_API_URL: apiUrl, PAGESPEED_API_KEY: '', ...env },
    });

  /**
   * Runs the script against the fake API without blocking the event loop that serves it.
   * @type {(args: string[], key?: string) => Promise<{ code: number, stdout: string, stderr: string }>}
   */
  const cliAsync = (args, key = '') =>
    new Promise((resolve) =>
      execFile(
        process.execPath,
        [script, ...args],
        { env: { ...process.env, PAGESPEED_API_URL: apiUrl, PAGESPEED_API_KEY: key } },
        (error, stdout, stderr) => resolve({ code: Number(error?.code ?? 0), stdout, stderr }),
      ),
    );

  it('prints the report with a summary and exits 0', async () => {
    next = { status: 200, body: response({ field: vitals(1800, 120, 5) }) };
    const { code, stdout } = await cliAsync(['https://www.example.com/', '--strategy', 'desktop'], 'secret-key');
    const report = JSON.parse(stdout);
    assert.equal(code, 0);
    assert.equal(report.strategy, 'desktop');
    assert.equal(report.summary.fail, 0);
    assert.equal(lastQuery?.get('key'), 'secret-key');
    assert.ok(!stdout.includes('secret-key'));
  });

  it('exits 2 with the cause on stderr when the API answers an error', async () => {
    next = { status: 429, body: { error: { code: 429, message: 'Quota exceeded' } } };
    const result = await cliAsync(['https://www.example.com/']);
    assert.equal(result.code, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /429: Quota exceeded \(set PAGESPEED_API_KEY/);
  });

  it('exits 2 without a URL, with a bad strategy, or when the API cannot be reached', () => {
    for (const [args, env] of [
      [[], {}],
      [['https://www.example.com/', '--strategy', 'tablet'], {}],
      [['https://www.example.com/'], { PAGESPEED_API_URL: 'http://127.0.0.1:1/runPagespeed' }],
      [['http://localhost:4173/'], {}],
    ]) {
      const { status, stdout, stderr } = cli(args, env);
      assert.equal(status, 2, `${args.join(' ')}: ${stderr}`);
      assert.equal(stdout, '');
      assert.ok(stderr.length > 0);
    }
  });
});
