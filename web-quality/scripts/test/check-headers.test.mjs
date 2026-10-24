import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { checkHeaders } from '../check-headers.mjs';

/**
 * A local site: `headers` on every response, `html` at /, a hashed asset, and `spaFallback`
 * deciding whether an unknown path gets index.html with 200 (the bug) or a 404.
 * @param {{ headers?: Record<string, string>, html?: string, spaFallback?: boolean, assetCache?: string }} site
 */
const serve = ({ headers = {}, html = '', spaFallback = false, assetCache } = {}) => {
  const server = createServer((request, response) => {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    if (request.url === '/') {
      response.setHeader('content-type', 'text/html');
      response.end(html);
    } else if (request.url === '/assets/index-AbCdEf12.js') {
      if (assetCache) response.setHeader('cache-control', assetCache);
      response.setHeader('content-type', 'text/javascript');
      response.end('export {}');
    } else if (spaFallback) {
      response.setHeader('content-type', 'text/html');
      response.end(html);
    } else {
      response.statusCode = 404;
      response.end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server));
  });
};

/** @type {(report: Awaited<ReturnType<typeof checkHeaders>>) => Record<string, string>} */
const statuses = (report) => Object.fromEntries(report.checks.map((check) => [check.id, check.status]));

describe('check-headers', () => {
  /** @type {import('node:http').Server[]} */
  const servers = [];
  /** @type {(site: Parameters<typeof serve>[0]) => Promise<string>} */
  const urlOf = async (site) => {
    const server = /** @type {import('node:http').Server} */ (await serve(site));
    servers.push(server);
    const address = /** @type {import('node:net').AddressInfo} */ (server.address());
    return `http://127.0.0.1:${address.port}/`;
  };
  before(() => {});
  after(() => {
    for (const server of servers) server.close();
  });

  it('passes a page with the headers, a meta CSP, long-cached hashed assets and a 404', async () => {
    const report = await checkHeaders(
      await urlOf({
        headers: {
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'SAMEORIGIN',
          'referrer-policy': 'strict-origin-when-cross-origin',
          'permissions-policy': 'camera=()',
          'cache-control': 'public, max-age=0, must-revalidate',
        },
        assetCache: 'public, max-age=31536000, immutable',
        html: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'"><script type="module" src="/assets/index-AbCdEf12.js"></script>`,
      }),
    );
    const got = statuses(report);
    for (const id of ['csp', 'nosniff', 'clickjacking', 'referrer-policy', 'html-cache', 'asset-cache', 'missing-asset']) {
      assert.equal(got[id], 'pass', id);
    }
    assert.equal(got.https, 'warn');
    assert.equal(got['csp-object-src'], undefined);
  });

  it('fails a page without protection headers whose missing assets get index.html', async () => {
    const report = await checkHeaders(
      await urlOf({ spaFallback: true, html: '<script type="module" src="/assets/index-AbCdEf12.js"></script>' }),
    );
    const got = statuses(report);
    assert.equal(got.csp, 'fail');
    assert.equal(got.nosniff, 'fail');
    assert.equal(got.clickjacking, 'fail');
    assert.equal(got['referrer-policy'], 'warn');
    assert.equal(got['missing-asset'], 'fail');
    assert.equal(got['asset-cache'], 'warn');
  });

  it("flags 'unsafe-inline' scripts without a nonce, a long-cached HTML and a missing base-uri", async () => {
    const report = await checkHeaders(
      await urlOf({
        headers: {
          'content-security-policy': "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          'cache-control': 'public, max-age=31536000, immutable',
        },
      }),
    );
    const got = statuses(report);
    assert.equal(got.csp, 'pass');
    assert.equal(got['csp-script-inline'], 'fail');
    assert.equal(got['csp-script-eval'], 'warn');
    assert.equal(got['csp-object-src'], 'warn');
    assert.equal(got['csp-base-uri'], 'warn');
    assert.equal(got['html-cache'], 'fail');
  });

  it('accepts inline scripts allowed by a nonce, and frame-ancestors in a header', async () => {
    const report = await checkHeaders(
      await urlOf({
        headers: {
          'content-security-policy': "script-src 'self' 'unsafe-inline' 'nonce-abc'; frame-ancestors 'none'",
        },
      }),
    );
    const got = statuses(report);
    assert.equal(got['csp-script-inline'], undefined);
    assert.equal(got.clickjacking, 'pass');
  });
});
