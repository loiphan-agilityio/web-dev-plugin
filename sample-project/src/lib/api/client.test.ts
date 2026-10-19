import { Effect, Schema } from 'effect';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { setSession } from '@/lib/session';
import { server } from '@/mocks/server';

import { ApiClient } from './client';
import { runEffect } from './run';

const Item = Schema.Struct({ id: Schema.Number });
const url = `${config.apiUrl}/items/1`;

const getItem = Effect.gen(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/items/1', Item);
});

/** Runs getItem and returns the rejection, so each test can assert on the ApiError it maps to. */
const failure = (response: () => Response) => {
  server.use(http.get(url, response));
  return runEffect(getItem).then(
    () => {
      throw new Error('expected the request to fail');
    },
    (error: unknown) => error,
  );
};

describe('ApiClient', () => {
  it('decodes a 2xx body with the schema', async () => {
    server.use(http.get(url, () => HttpResponse.json({ id: 1 })));
    await expect(runEffect(getItem)).resolves.toEqual({ id: 1 });
  });

  it.each([
    [401, 'UnauthorizedError'],
    [403, 'ForbiddenError'],
    [404, 'NotFoundError'],
    [500, 'ServerError'],
    [503, 'ServerError'],
  ])('maps status %i to %s', async (status, tag) => {
    const error = await failure(() => HttpResponse.json({}, { status }));
    expect(error).toMatchObject({ _tag: tag });
  });

  it('maps 422 field errors to ValidationError.fields', async () => {
    const error = await failure(() =>
      HttpResponse.json({ message: 'Invalid', errors: { name: 'Taken' } }, { status: 422 }),
    );
    expect(error).toMatchObject({
      _tag: 'ValidationError',
      message: 'Invalid',
      fields: { name: 'Taken' },
    });
  });

  it('maps 409 to ValidationError with the server message', async () => {
    const error = await failure(() =>
      HttpResponse.json(
        { statusCode: 409, error: 'Conflict', message: 'Email is already registered' },
        { status: 409 },
      ),
    );
    expect(error).toMatchObject({
      _tag: 'ValidationError',
      message: 'Email is already registered',
      fields: {},
    });
  });

  it('sends the stored session as a Bearer token', async () => {
    setSession({ token: 'abc', expiresAt: '2099-01-01T00:00:00.000Z', email: 'a@b.co' });
    const seen: (string | null)[] = [];
    server.use(
      http.get(url, ({ request }) => {
        seen.push(request.headers.get('authorization'));
        return HttpResponse.json({ id: 1 });
      }),
    );
    await runEffect(getItem);
    expect(seen).toEqual(['Bearer abc']);
  });

  it('sends no Authorization header when signed out', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get(url, ({ request }) => {
        seen.push(request.headers.get('authorization'));
        return HttpResponse.json({ id: 1 });
      }),
    );
    await runEffect(getItem);
    expect(seen).toEqual([null]);
  });

  it('maps a network failure to NetworkError', async () => {
    const error = await failure(() => HttpResponse.error());
    expect(error).toMatchObject({ _tag: 'NetworkError' });
  });

  it('maps a body that does not match the schema to InvalidResponseError', async () => {
    const error = await failure(() => HttpResponse.json({ id: 'not-a-number' }));
    expect(error).toMatchObject({ _tag: 'InvalidResponseError' });
  });
});
