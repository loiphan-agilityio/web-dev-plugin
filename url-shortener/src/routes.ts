import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createSession, hashPassword, hashToken, verifyPassword } from './db.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** users.id of the caller, set by authenticate on /api routes. */
    userId: number;
  }
}

// Static routes win over /:code, so these aliases could never redirect.
const RESERVED = new Set(['api', 'docs']);
const SQLITE_CONSTRAINT_PRIMARYKEY = 1555;
const SQLITE_CONSTRAINT_UNIQUE = 2067;

const HttpError = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
});

const Link = Type.Object({
  code: Type.String({ examples: ['aB3_x9Qz'] }),
  shortUrl: Type.String({ format: 'uri' }),
  url: Type.String({ format: 'uri' }),
  clicks: Type.Integer(),
  createdAt: Type.String({ format: 'date-time' }),
  expiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

const CreateLink = Type.Object({
  // The pattern blocks javascript:, data: and other schemes we would otherwise redirect to.
  url: Type.String({ format: 'uri', pattern: '^https?://', maxLength: 2048, examples: ['https://example.com/a/very/long/path'] }),
  alias: Type.Optional(Type.String({ pattern: '^[A-Za-z0-9_-]{3,32}$', description: '3–32 chars: letters, digits, _ or -', examples: ['my-link'] })),
  expiresAt: Type.Optional(Type.String({ format: 'date-time', description: 'Must be in the future' })),
});

const CodeParams = Type.Object({ code: Type.String() });

const Credentials = Type.Object({
  email: Type.String({ format: 'email', maxLength: 254, examples: ['alice@example.com'] }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
});

const Session = Type.Object({
  token: Type.String({ description: 'Send as `Authorization: Bearer <token>`' }),
  expiresAt: Type.String({ format: 'date-time' }),
});

type Row = { code: string; url: string; clicks: number; createdAt: string; expiresAt: string | null };

const httpError = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

export const routes: FastifyPluginAsyncTypebox<{ db: DatabaseSync; baseUrl: string }> = async (app, { db, baseUrl }) => {
  const insert = db.prepare('INSERT INTO links (code, url, createdAt, expiresAt, ownerId) VALUES (?, ?, ?, ?, ?)');
  const select = db.prepare('SELECT * FROM links WHERE code = ?');
  const selectOwned = db.prepare('SELECT * FROM links WHERE code = ? AND ownerId = ?');
  const list = db.prepare('SELECT * FROM links WHERE ownerId = ? ORDER BY rowid DESC LIMIT ? OFFSET ?');
  const count = db.prepare('SELECT COUNT(*) AS total FROM links WHERE ownerId = ?');
  const remove = db.prepare('DELETE FROM links WHERE code = ? AND ownerId = ?');
  const hit = db.prepare('UPDATE links SET clicks = clicks + 1 WHERE code = ?');
  const insertUser = db.prepare('INSERT INTO users (email, passwordHash, createdAt) VALUES (?, ?, ?)');
  const findUser = db.prepare('SELECT id, passwordHash FROM users WHERE email = ?');
  const findSession = db.prepare('SELECT userId FROM sessions WHERE hash = ? AND expiresAt > ?');
  const deleteSession = db.prepare('DELETE FROM sessions WHERE hash = ?');
  const deleteExpired = db.prepare('DELETE FROM sessions WHERE expiresAt <= ?');

  app.decorateRequest('userId', 0);

  const bearer = (req: FastifyRequest) => req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];

  // onRequest, so unauthenticated calls are rejected before their body is parsed or validated.
  const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
    const token = bearer(req);
    const row = token ? (findSession.get(hashToken(token), new Date().toISOString()) as { userId: number } | undefined) : undefined;
    if (!row) {
      reply.header('www-authenticate', 'Bearer');
      throw httpError(401, 'Missing, invalid or expired session');
    }
    req.userId = row.userId;
  };

  app.post('/api/auth/register', {
    schema: {
      tags: ['auth'],
      summary: 'Create an account and log in',
      security: [],
      body: Credentials,
      response: { 201: Session, 400: HttpError, 409: HttpError },
    },
  }, async (req, reply) => {
    const passwordHash = await hashPassword(req.body.password);
    let user;
    try {
      user = insertUser.run(req.body.email, passwordHash, new Date().toISOString());
    } catch (err) {
      if ((err as { errcode?: number }).errcode !== SQLITE_CONSTRAINT_UNIQUE) throw err;
      throw httpError(409, 'Email is already registered');
    }
    return reply.code(201).send(createSession(db, Number(user.lastInsertRowid)));
  });

  app.post('/api/auth/login', {
    schema: {
      tags: ['auth'],
      summary: 'Log in and get a session token',
      security: [],
      body: Credentials,
      response: { 200: Session, 400: HttpError, 401: HttpError },
    },
  }, async (req) => {
    const user = findUser.get(req.body.email) as { id: number; passwordHash: string } | undefined;
    // Same message for both cases, so login does not reveal which emails have accounts.
    if (!user || !(await verifyPassword(req.body.password, user.passwordHash))) throw httpError(401, 'Invalid email or password');
    deleteExpired.run(new Date().toISOString());
    return createSession(db, user.id);
  });

  app.post('/api/auth/logout', {
    onRequest: authenticate,
    schema: {
      tags: ['auth'],
      summary: 'End this session; its token stops working',
      response: { 204: Type.Null({ description: 'Logged out' }), 401: HttpError },
    },
  }, async (req, reply) => {
    deleteSession.run(hashToken(bearer(req)!));
    return reply.code(204).send(null);
  });

  const toLink = (row: Row) => ({ ...row, shortUrl: `${baseUrl}/${row.code}` });
  // Another user's link is a 404, not a 403, so callers cannot probe which codes exist.
  const find = (code: string, ownerId?: number) => {
    const row = (ownerId === undefined ? select.get(code) : selectOwned.get(code, ownerId)) as Row | undefined;
    if (!row) throw httpError(404, 'Link not found');
    return row;
  };

  app.post('/api/links', {
    onRequest: authenticate,
    schema: {
      tags: ['links'],
      summary: 'Create a short link',
      body: CreateLink,
      response: { 201: Link, 400: HttpError, 401: HttpError, 409: HttpError },
    },
  }, async (req, reply) => {
    const { url, alias } = req.body;
    if (alias && RESERVED.has(alias)) throw httpError(400, `Alias "${alias}" is reserved`);
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt).toISOString() : null;
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) throw httpError(400, 'expiresAt must be in the future');

    const createdAt = new Date().toISOString();
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = alias ?? randomBytes(6).toString('base64url');
      try {
        insert.run(code, url, createdAt, expiresAt, req.userId);
      } catch (err) {
        if ((err as { errcode?: number }).errcode !== SQLITE_CONSTRAINT_PRIMARYKEY) throw err;
        if (alias) throw httpError(409, `Alias "${alias}" is already taken`);
        continue;
      }
      return reply.code(201).send(toLink({ code, url, clicks: 0, createdAt, expiresAt }));
    }
    throw new Error('Could not generate a unique code');
  });

  app.get('/api/links', {
    onRequest: authenticate,
    schema: {
      tags: ['links'],
      summary: 'List your links, newest first',
      querystring: Type.Object({
        limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
        offset: Type.Integer({ minimum: 0, default: 0 }),
      }),
      response: { 200: Type.Object({ items: Type.Array(Link), total: Type.Integer() }), 400: HttpError, 401: HttpError },
    },
  }, async (req) => {
    const rows = list.all(req.userId, req.query.limit, req.query.offset) as Row[];
    const { total } = count.get(req.userId) as { total: number };
    return { items: rows.map(toLink), total };
  });

  app.get('/api/links/:code', {
    onRequest: authenticate,
    schema: {
      tags: ['links'],
      summary: 'Get one of your links and its click count',
      params: CodeParams,
      response: { 200: Link, 401: HttpError, 404: HttpError },
    },
  }, async (req) => toLink(find(req.params.code, req.userId)));

  app.delete('/api/links/:code', {
    onRequest: authenticate,
    schema: {
      tags: ['links'],
      summary: 'Delete one of your links',
      params: CodeParams,
      response: { 204: Type.Null({ description: 'Deleted' }), 401: HttpError, 404: HttpError },
    },
  }, async (req, reply) => {
    if (!remove.run(req.params.code, req.userId).changes) throw httpError(404, 'Link not found');
    return reply.code(204).send(null);
  });

  app.get('/:code', {
    schema: {
      tags: ['redirect'],
      summary: 'Redirect to the original URL and count the click',
      security: [],
      params: CodeParams,
      response: {
        302: Type.Null({ description: 'Redirect; the target is in the Location header' }),
        404: HttpError,
        410: HttpError,
      },
    },
  }, async (req, reply) => {
    const row = find(req.params.code);
    if (row.expiresAt && Date.parse(row.expiresAt) <= Date.now()) throw httpError(410, 'Link has expired');
    hit.run(row.code);
    // 302, not 301: browsers cache 301s and later clicks would never reach us to be counted.
    return reply.redirect(row.url, 302);
  });
};
