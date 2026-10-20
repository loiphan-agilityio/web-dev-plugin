import { NotFoundError, ServerError } from '@/lib/api/errors';

import { createQueryClient } from '../query-client';

describe('createQueryClient', () => {
  const { queries, mutations } = createQueryClient().getDefaultOptions();
  const retry = queries?.retry;
  assert(typeof retry === 'function', 'queries.retry should be a function');

  it('retries a transient failure once', () => {
    expect(retry(0, new ServerError({ status: 503 }))).toBe(true);
    expect(retry(1, new ServerError({ status: 503 }))).toBe(false);
  });

  it('never retries a 4xx answer or a mutation', () => {
    expect(retry(0, new NotFoundError())).toBe(false);
    expect(mutations?.retry).toBe(0);
  });
});
