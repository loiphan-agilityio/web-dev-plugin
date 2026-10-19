import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';
import type { Session } from '@/lib/session';

import type { AuthToken, Credentials } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

// Far future, so it stays valid even in a test that fakes Date.
const expiresAt = '2099-01-01T00:00:00.000Z';

/** A signed-in user: `setSession(sessionFixture)` in tests that render the app. */
export const sessionFixture: Session = {
  token: 'test-token',
  expiresAt,
  email: 'alice@example.com',
};

const authToken: AuthToken = { token: 'mock-token', expiresAt };

/** The API's error body: `{ statusCode, error, message }`. */
const failure = (status: number, error: string, message: string) =>
  HttpResponse.json({ statusCode: status, error, message }, { status });

/**
 * A small in-memory backend: `initial` maps email to password. Each call gets its own copy, so
 * `server.use(...createAuthHandlers())` never sees users registered by another test.
 */
export const createAuthHandlers = (
  initial: Record<string, string> = { [sessionFixture.email]: 'password123' },
) => {
  const users = new Map(Object.entries(initial));
  return [
    http.post(url('/auth/register'), async ({ request }) => {
      const { email, password } = (await request.json()) as Credentials;
      if (users.has(email)) return failure(409, 'Conflict', 'Email is already registered');
      users.set(email, password);
      return HttpResponse.json(authToken, { status: 201 });
    }),
    http.post(url('/auth/login'), async ({ request }) => {
      const { email, password } = (await request.json()) as Credentials;
      if (users.get(email) !== password) {
        return failure(401, 'Unauthorized', 'Invalid email or password');
      }
      return HttpResponse.json(authToken);
    }),
    http.post(url('/auth/logout'), () => new HttpResponse(null, { status: 204 })),
  ];
};

/** Default handlers, registered in src/mocks/handlers.ts. */
export const authHandlers = createAuthHandlers();

/** One-off responses for the states a test needs to drive. */
export const authMocks = {
  loginPending: () =>
    http.post(url('/auth/login'), async () => {
      await delay('infinite');
      return HttpResponse.json(authToken);
    }),
  /** Any auth endpoint failing, e.g. `fail('register', 400, 'body/email must match format')`. */
  fail: (endpoint: 'login' | 'register' | 'logout', status: number, message = 'Boom') =>
    http.post(url(`/auth/${endpoint}`), () => failure(status, 'Error', message)),
};
