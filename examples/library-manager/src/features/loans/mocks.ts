import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { addDays, today } from '@/lib/dates';
import { config } from '@/lib/config';
import {
  createLibraryDb,
  type LibraryDb,
  loanStatus,
  nextId,
  openLoans,
  withStatus,
} from '@/mocks/library-db';

import type { Loan, LoanStats } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

const invalid = (errors: Record<string, string>, message = 'Validation failed') =>
  HttpResponse.json({ message, errors }, { status: 422 });

const notFound = (message: string) => HttpResponse.json({ message }, { status: 404 });

interface NewLoanBody {
  bookId: number;
  memberId: number;
  dueDate?: string;
}

/**
 * The loans half of the in-memory backend. `db` is shared with the books and members handlers:
 * lending takes a copy off the book, returning puts it back. With no argument it is a fresh copy
 * of the fixtures. The list and stats endpoints derive each loan's status from today's date.
 */
export const createLoansHandlers = (db: LibraryDb = createLibraryDb()) => [
  http.get(url('/loans'), () => HttpResponse.json(db.loans.map(withStatus))),
  // A fixed path goes before a path with a parameter.
  http.get(url('/loans/stats'), () => {
    const open = db.loans.filter(({ returnedAt }) => returnedAt === null);
    const weekEnd = addDays(today(), 7);
    const stats: LoanStats = {
      books: db.books.length,
      members: db.members.length,
      activeLoans: open.length,
      overdueLoans: open.filter((loan) => loanStatus(loan) === 'overdue').length,
      dueThisWeek: open.filter(({ dueDate }) => dueDate >= today() && dueDate <= weekEnd).length,
    };
    return HttpResponse.json(stats);
  }),
  http.post<never, NewLoanBody>(url('/loans'), async ({ request }) => {
    const { bookId, memberId, dueDate } = await request.json();
    const book = db.books.find(({ id }) => id === bookId);
    if (!book) return notFound('Book not found');
    const member = db.members.find(({ id }) => id === memberId);
    if (!member) return notFound('Member not found');
    if (member.status === 'suspended') {
      return invalid({ memberId: 'This member is suspended and cannot borrow' });
    }
    if (book.availableCopies < 1) {
      return invalid({ bookId: 'No copies of this book are available' });
    }
    if (dueDate !== undefined && dueDate < today()) {
      return invalid({ dueDate: 'The due date cannot be in the past' });
    }
    const loan: Loan = {
      id: nextId(db.loans),
      bookId,
      memberId,
      bookTitle: book.title,
      memberName: member.name,
      borrowedAt: today(),
      dueDate: dueDate ?? addDays(today(), 14),
      returnedAt: null,
      status: 'active',
    };
    db.loans.push(loan);
    book.availableCopies -= 1;
    return HttpResponse.json(withStatus(loan), { status: 201 });
  }),
  http.post<{ id: string }>(url('/loans/:id/return'), ({ params }) => {
    const loan = db.loans.find(({ id }) => id === Number(params.id));
    if (!loan) return notFound('Loan not found');
    if (loan.returnedAt !== null) {
      return HttpResponse.json({ message: 'This loan was already returned.' }, { status: 409 });
    }
    loan.returnedAt = today();
    const book = db.books.find(({ id }) => id === loan.bookId);
    if (book) book.availableCopies = book.totalCopies - openLoans(db, { bookId: book.id }).length;
    return HttpResponse.json(withStatus(loan));
  }),
];

/** One-off responses for the states a test or story needs to drive. */
export const loansMocks = {
  listPending: () =>
    http.get(url('/loans'), async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    }),
  listError: (status = 500) =>
    http.get(url('/loans'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  statsPending: () =>
    http.get(url('/loans/stats'), async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  statsError: (status = 500) =>
    http.get(url('/loans/stats'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  createInvalid: (errors: Record<string, string>) =>
    http.post(url('/loans'), () => invalid(errors)),
  createError: (status = 500) =>
    http.post(url('/loans'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  returnPending: () =>
    http.post(url('/loans/:id/return'), async () => {
      await delay('infinite');
      return HttpResponse.json({});
    }),
  returnConflict: (message = 'This loan was already returned.') =>
    http.post(url('/loans/:id/return'), () => HttpResponse.json({ message }, { status: 409 })),
  returnNotFound: () => http.post(url('/loans/:id/return'), () => notFound('Loan not found')),
};
