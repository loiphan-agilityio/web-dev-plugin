import type { Book } from '@/features/books/schemas';
import type { Loan } from '@/features/loans/schemas';
import type { Member } from '@/features/members/schemas';
import { today } from '@/lib/dates';

import { libraryFixtures } from './library-fixtures';

/** The schema types are readonly; the fake backend edits its records in place. */
type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

export interface LibraryDb {
  readonly books: Mutable<Book>[];
  readonly members: Mutable<Member>[];
  readonly loans: Mutable<Loan>[];
}

/**
 * The in-memory backend the three features' handlers share, because a loan changes a book's
 * copies and a book or member with open loans cannot be deleted. Each call copies its seed, so
 * tests never see state left over from another test. A part left out of `seed` starts empty;
 * with no argument the db holds the full fixtures.
 */
export const createLibraryDb = (seed: Partial<LibraryDb> = libraryFixtures): LibraryDb => ({
  books: structuredClone(seed.books ?? []),
  members: structuredClone(seed.members ?? []),
  loans: structuredClone(seed.loans ?? []),
});

/** The server's rule: returned when returnedAt is set, overdue once past the due date, else active. */
export const loanStatus = ({
  returnedAt,
  dueDate,
}: Pick<Loan, 'returnedAt' | 'dueDate'>): Loan['status'] => {
  if (returnedAt !== null) return 'returned';
  return dueDate < today() ? 'overdue' : 'active';
};

export const withStatus = (loan: Loan): Loan => ({ ...loan, status: loanStatus(loan) });

/** Open loans (not returned) of one book or member. */
export const openLoans = (db: LibraryDb, by: { bookId: number } | { memberId: number }) =>
  db.loans.filter(
    (loan) =>
      loan.returnedAt === null &&
      ('bookId' in by ? loan.bookId === by.bookId : loan.memberId === by.memberId),
  );

export const nextId = (items: readonly { id: number }[]) =>
  items.reduce((max, { id }) => Math.max(max, id), 0) + 1;
