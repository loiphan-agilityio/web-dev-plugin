import { Schema } from 'effect';

export const LoanStatus = Schema.Literals(['active', 'returned', 'overdue']);
export type LoanStatus = typeof LoanStatus.Type;

/** A loan as the API returns it. `status` is derived by the server from the dates. */
export const Loan = Schema.Struct({
  id: Schema.Number,
  bookId: Schema.Number,
  memberId: Schema.Number,
  bookTitle: Schema.String,
  memberName: Schema.String,
  borrowedAt: Schema.String,
  dueDate: Schema.String,
  returnedAt: Schema.NullOr(Schema.String),
  status: LoanStatus,
});
export type Loan = typeof Loan.Type;

export const LoanList = Schema.Array(Loan);

/** The numbers on the overview page. `activeLoans` counts every loan not yet returned. */
export const LoanStats = Schema.Struct({
  books: Schema.Number,
  members: Schema.Number,
  activeLoans: Schema.Number,
  overdueLoans: Schema.Number,
  dueThisWeek: Schema.Number,
});
export type LoanStats = typeof LoanStats.Type;

const selectedId = (message: string) =>
  Schema.NumberFromString.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1, { message })));

/**
 * The lend form. The selects hold the id as text (`''` until chosen); `dueDate` is `''` when the
 * librarian leaves it to the server's default.
 */
export const NewLoan = Schema.Struct({
  bookId: selectedId('Select a book'),
  memberId: selectedId('Select a member'),
  dueDate: Schema.String.pipe(
    Schema.check(Schema.isPattern(/^(\d{4}-\d{2}-\d{2})?$/, { message: 'Enter a valid due date' })),
  ),
});
export type NewLoan = typeof NewLoan.Type;
export type NewLoanInput = typeof NewLoan.Encoded;
