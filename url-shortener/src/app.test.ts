import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildApp } from './app.ts';
import { hashToken, openDb } from './db.ts';

const BASE = 'http://sho.rt';

async function setup(t: TestContext, corsOrigins: string[] = []) {
  const db = openDb(':memory:');
  const app = await buildApp(db, BASE, corsOrigins);
  t.after(() => app.close());
  const auth = (action: 'register' | 'login', email: string, password = 'correct horse') =>
    app.inject({ method: 'POST', url: `/api/auth/${action}`, payload: { email, password } });
  const register = async (email: string): Promise<string> => (await auth('register', email)).json().token;
  const as = (token: string) => {
    const headers = { authorization: `Bearer ${token}` };
    return {
      create: (payload: object) => app.inject({ method: 'POST', url: '/api/links', payload, headers }),
      api: (url: string, method: 'GET' | 'POST' | 'DELETE' = 'GET') => app.inject({ method, url, headers }),
    };
  };
  return { db, app, auth, register, as, ...as(await register('test@example.com')) };
}

test('creates a link, redirects with 302 and counts clicks', async (t) => {
  const { app, create, api } = await setup(t);

  const res = await create({ url: 'https://example.com/long/path?q=1' });
  assert.equal(res.statusCode, 201);
  const link = res.json();
  assert.match(link.code, /^[A-Za-z0-9_-]{8}$/);
  assert.equal(link.shortUrl, `${BASE}/${link.code}`);
  assert.equal(link.clicks, 0);
  assert.equal(link.expiresAt, null);

  const redirect = await app.inject(`/${link.code}`);
  assert.equal(redirect.statusCode, 302);
  assert.equal(redirect.headers.location, 'https://example.com/long/path?q=1');

  const info = (await api(`/api/links/${link.code}`)).json();
  assert.equal(info.clicks, 1);
  assert.equal('ownerId' in info, false);
});

test('rejects URLs that are not http(s)', async (t) => {
  const { create } = await setup(t);
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://example.com', 'not a url']) {
    assert.equal((await create({ url })).statusCode, 400, url);
  }
});

test('custom alias: taken → 409, reserved or malformed → 400', async (t) => {
  const { create } = await setup(t);
  const res = await create({ url: 'https://example.com', alias: 'my-link' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().code, 'my-link');

  assert.equal((await create({ url: 'https://example.org', alias: 'my-link' })).statusCode, 409);
  assert.equal((await create({ url: 'https://example.com', alias: 'docs' })).statusCode, 400);
  assert.equal((await create({ url: 'https://example.com', alias: 'ab' })).statusCode, 400);
  assert.equal((await create({ url: 'https://example.com', alias: 'has space' })).statusCode, 400);
});

test('expiry: past date rejected on create, expired link → 410, future link redirects', async (t) => {
  const { db, app, create } = await setup(t);
  assert.equal((await create({ url: 'https://example.com', expiresAt: '2000-01-01T00:00:00Z' })).statusCode, 400);

  db.prepare('INSERT INTO links (code, url, createdAt, expiresAt) VALUES (?, ?, ?, ?)')
    .run('old', 'https://example.com', '2000-01-01T00:00:00.000Z', '2000-01-02T00:00:00.000Z');
  const gone = await app.inject('/old');
  assert.equal(gone.statusCode, 410);
  assert.equal(gone.json().message, 'Link has expired');

  const future = new Date(Date.now() + 60_000).toISOString();
  const res = await create({ url: 'https://example.com', alias: 'soon', expiresAt: future });
  assert.equal(res.json().expiresAt, future);
  assert.equal((await app.inject('/soon')).statusCode, 302);
});

test('lists links newest first with pagination', async (t) => {
  const { create, api } = await setup(t);
  for (const alias of ['one', 'two', 'three']) await create({ url: 'https://example.com', alias });

  const page1 = (await api('/api/links?limit=2')).json();
  assert.equal(page1.total, 3);
  assert.deepEqual(page1.items.map((l: { code: string }) => l.code), ['three', 'two']);

  const page2 = (await api('/api/links?limit=2&offset=2')).json();
  assert.deepEqual(page2.items.map((l: { code: string }) => l.code), ['one']);

  assert.equal((await api('/api/links?limit=101')).statusCode, 400);
});

test('deletes a link; unknown codes → 404', async (t) => {
  const { app, create, api } = await setup(t);
  await create({ url: 'https://example.com', alias: 'bye' });

  assert.equal((await api('/api/links/bye', 'DELETE')).statusCode, 204);
  assert.equal((await api('/api/links/bye')).statusCode, 404);
  assert.equal((await api('/api/links/bye', 'DELETE')).statusCode, 404);
  assert.equal((await app.inject('/bye')).statusCode, 404);
});

test('register, login and logout', async (t) => {
  const { auth, as } = await setup(t);

  const reg = await auth('register', 'alice@example.com');
  assert.equal(reg.statusCode, 201);
  assert.ok(Date.parse(reg.json().expiresAt) > Date.now());
  const first = as(reg.json().token);
  assert.equal((await first.api('/api/links')).statusCode, 200);

  assert.equal((await auth('register', 'ALICE@example.com')).statusCode, 409);
  assert.equal((await auth('register', 'not-an-email')).statusCode, 400);
  assert.equal((await auth('register', 'bob@example.com', 'short77')).statusCode, 400);

  const wrongPassword = await auth('login', 'alice@example.com', 'wrong password');
  assert.equal(wrongPassword.statusCode, 401);
  assert.deepEqual(wrongPassword.json(), (await auth('login', 'nobody@example.com')).json());

  const login = await auth('login', 'Alice@Example.com');
  assert.equal(login.statusCode, 200);
  const second = as(login.json().token);
  assert.equal((await second.api('/api/auth/logout', 'POST')).statusCode, 204);
  assert.equal((await second.api('/api/links')).statusCode, 401);
  assert.equal((await first.api('/api/links')).statusCode, 200, 'other sessions stay logged in');
});

test('auth: missing, wrong, logged-out or expired token → 401; redirect and docs stay public', async (t) => {
  const { db, app, auth, register, as, create } = await setup(t);
  await create({ url: 'https://example.com', alias: 'pub' });

  const loggedOut = await register('gone@example.com');
  assert.equal((await as(loggedOut).api('/api/auth/logout', 'POST')).statusCode, 204);
  const expired = await register('old@example.com');
  db.prepare('UPDATE sessions SET expiresAt = ? WHERE hash = ?').run('2000-01-01T00:00:00.000Z', hashToken(expired));

  const requests = [
    { method: 'POST', url: '/api/links', payload: { url: 'https://example.com' } },
    { method: 'GET', url: '/api/links' },
    { method: 'GET', url: '/api/links/pub' },
    { method: 'DELETE', url: '/api/links/pub' },
    { method: 'POST', url: '/api/auth/logout' },
  ] as const;
  const authorizations = {
    none: undefined,
    basic: 'Basic dGVzdA==',
    wrong: 'Bearer not-a-real-token',
    loggedOut: `Bearer ${loggedOut}`,
    expired: `Bearer ${expired}`,
  };
  for (const [label, authorization] of Object.entries(authorizations)) {
    for (const req of requests) {
      const res = await app.inject({ ...req, headers: authorization ? { authorization } : {} });
      assert.equal(res.statusCode, 401, `${label} ${req.method} ${req.url}`);
      assert.equal(res.headers['www-authenticate'], 'Bearer');
    }
  }

  // Login sweeps expired sessions so the table does not grow forever.
  await auth('login', 'old@example.com');
  assert.equal(db.prepare('SELECT 1 FROM sessions WHERE hash = ?').get(hashToken(expired)), undefined);

  assert.equal((await app.inject('/pub')).statusCode, 302);
  assert.equal((await app.inject('/docs')).statusCode, 200);
});

test('refuses a database from the API-key era', (t) => {
  const path = join(mkdtempSync(join(tmpdir(), 'url-shortener-')), 'old.db');
  t.after(() => rmSync(dirname(path), { recursive: true }));
  const old = new DatabaseSync(path);
  old.exec('CREATE TABLE api_keys (id INTEGER PRIMARY KEY)');
  old.close();
  assert.throws(() => openDb(path), /old API-key schema/);
});

test('each user only sees and deletes their own links', async (t) => {
  const { app, create, register, as } = await setup(t);
  await create({ url: 'https://example.com', alias: 'mine' });
  const other = as(await register('other@example.com'));

  assert.equal((await other.api('/api/links/mine')).statusCode, 404);
  assert.equal((await other.api('/api/links/mine', 'DELETE')).statusCode, 404);
  assert.deepEqual((await other.api('/api/links')).json(), { items: [], total: 0 });
  assert.equal((await other.create({ url: 'https://example.org', alias: 'mine' })).statusCode, 409);
  assert.equal((await app.inject('/mine')).headers.location, 'https://example.com');
});

test('CORS: allowlisted origins only, off by default', async (t) => {
  const origin = 'https://app.example';
  const { app } = await setup(t, [origin]);

  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/api/links/abc',
    headers: { origin, 'access-control-request-method': 'DELETE', 'access-control-request-headers': 'authorization' },
  });
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], origin);
  assert.match(String(preflight.headers['access-control-allow-methods']), /DELETE/);
  assert.match(String(preflight.headers['access-control-allow-headers']), /Authorization/);

  // A browser must be able to read the 401, or the frontend cannot tell a bad key from a network error.
  const unauthorized = await app.inject({ url: '/api/links', headers: { origin } });
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.headers['access-control-allow-origin'], origin);

  const stranger = await app.inject({ url: '/api/links', headers: { origin: 'https://evil.example' } });
  assert.equal(stranger.headers['access-control-allow-origin'], undefined);

  const { app: noCors } = await setup(t);
  assert.equal((await noCors.inject({ url: '/api/links', headers: { origin } })).headers['access-control-allow-origin'], undefined);
});

test('serves the OpenAPI document and Swagger UI', async (t) => {
  const { app } = await setup(t);
  const spec = (await app.inject('/docs/json')).json();
  assert.equal(spec.openapi.slice(0, 2), '3.');
  assert.deepEqual(Object.keys(spec.paths).sort(), [
    '/api/auth/login', '/api/auth/logout', '/api/auth/register', '/api/links', '/api/links/{code}', '/{code}',
  ]);
  assert.deepEqual(spec.paths['/{code}'].get.security, []);
  assert.deepEqual(spec.paths['/api/auth/register'].post.security, []);
  assert.deepEqual(spec.paths['/api/auth/login'].post.security, []);
  assert.equal(spec.paths['/api/auth/logout'].post.security, undefined, 'logout needs the global bearer auth');
  assert.equal((await app.inject('/docs')).statusCode, 200);
});
