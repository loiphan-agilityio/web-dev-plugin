import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';

import type { Link, NewLink } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

/** The API's error body: `{ statusCode, error, message }`. */
const failure = (status: number, error: string, message: string) =>
  HttpResponse.json({ statusCode: status, error, message }, { status });

export const linkFixture: Link = {
  code: 'abc123',
  shortUrl: 'http://localhost:3000/abc123',
  url: 'https://example.com/a/very/long/path',
  clicks: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: null,
};

/** `count` links, oldest first (the order the in-memory backend stores them): link-1 … link-N. */
export const makeLinks = (count: number): Link[] =>
  Array.from({ length: count }, (_, index) => ({
    ...linkFixture,
    code: `link-${index + 1}`,
    shortUrl: `http://localhost:3000/link-${index + 1}`,
    url: `https://example.com/page-${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));

/**
 * A small in-memory backend. Each call gets its own copy, so `server.use(...createLinksHandlers())`
 * never sees links created by another test. GET pages newest first like the real API
 * (`limit` defaults to 20, `offset` to 0); POST answers 409 when the alias is taken.
 */
export const createLinksHandlers = (initial: Link[] = []) => {
  const links = [...initial];
  return [
    http.get(url('/links'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const limit = Number(params.get('limit') ?? 20);
      const offset = Number(params.get('offset') ?? 0);
      return HttpResponse.json({
        items: [...links].reverse().slice(offset, offset + limit),
        total: links.length,
      });
    }),
    http.post(url('/links'), async ({ request }) => {
      const { url: target, alias, expiresAt } = (await request.json()) as NewLink;
      const code = alias ?? `gen${String(links.length + 1).padStart(5, '0')}`;
      if (links.some((link) => link.code === code)) {
        return failure(409, 'Conflict', `Alias "${code}" is already taken`);
      }
      const link: Link = {
        code,
        shortUrl: `http://localhost:3000/${code}`,
        url: target,
        clicks: 0,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt ?? null,
      };
      links.push(link);
      return HttpResponse.json(link, { status: 201 });
    }),
  ];
};

/** Default handlers, registered in src/mocks/handlers.ts. */
export const linksHandlers = createLinksHandlers();

/** One-off responses for the states a test needs to drive. */
export const linksMocks = {
  listPending: () =>
    http.get(url('/links'), async () => {
      await delay('infinite');
      return HttpResponse.json({ items: [], total: 0 });
    }),
  /** List failing, e.g. `listFail(500)`. */
  listFail: (status: number, message = 'Boom') =>
    http.get(url('/links'), () => failure(status, 'Error', message)),
  createPending: () =>
    http.post(url('/links'), async () => {
      await delay('infinite');
      return HttpResponse.json(linkFixture, { status: 201 });
    }),
  /** Create failing, e.g. `fail(400, 'Alias "api" is reserved')`. */
  fail: (status: number, message = 'Boom') =>
    http.post(url('/links'), () => failure(status, 'Error', message)),
};
