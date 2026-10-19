import { Effect, Schema } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { AuthToken, type Credentials } from './schemas';

export const login = Effect.fn('auth.login')(function* (input: Credentials) {
  const api = yield* ApiClient;
  return yield* api.post('/auth/login', input, AuthToken);
});

export const register = Effect.fn('auth.register')(function* (input: Credentials) {
  const api = yield* ApiClient;
  return yield* api.post('/auth/register', input, AuthToken);
});

export const logout = Effect.fn('auth.logout')(function* () {
  const api = yield* ApiClient;
  // 204 has no body; an empty body decodes to null. ApiClient adds the Bearer token.
  return yield* api.post('/auth/logout', {}, Schema.Null);
});
