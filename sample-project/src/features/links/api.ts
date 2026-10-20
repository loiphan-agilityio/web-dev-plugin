import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { Link, LinkPage, type NewLink } from './schemas';

export const createLink = Effect.fn('links.create')(function* (input: NewLink) {
  const api = yield* ApiClient;
  return yield* api.post('/links', input, Link);
});

export const listLinks = Effect.fn('links.list')(function* (page: {
  readonly limit: number;
  readonly offset: number;
}) {
  const api = yield* ApiClient;
  return yield* api.get('/links', LinkPage, {
    urlParams: { limit: String(page.limit), offset: String(page.offset) },
  });
});
