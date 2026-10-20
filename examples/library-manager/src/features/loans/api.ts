import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { Loan, LoanList, LoanStats, type NewLoan } from './schemas';

export const listLoans = Effect.fn('loans.list')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/loans', LoanList);
});

export const getLoanStats = Effect.fn('loans.stats')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/loans/stats', LoanStats);
});

/** An empty due date is left out of the body, so the server applies its 14-day default. */
export const createLoan = Effect.fn('loans.create')(function* ({
  bookId,
  memberId,
  dueDate,
}: NewLoan) {
  const api = yield* ApiClient;
  return yield* api.post(
    '/loans',
    { bookId, memberId, ...(dueDate === '' ? {} : { dueDate }) },
    Loan,
  );
});

export const returnLoan = Effect.fn('loans.return')(function* (id: number) {
  const api = yield* ApiClient;
  return yield* api.post(`/loans/${id}/return`, {}, Loan);
});
