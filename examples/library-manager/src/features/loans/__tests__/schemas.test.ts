import { Schema } from 'effect';

import { Loan, NewLoan } from '../schemas';

const decode = Schema.decodeUnknownSync(NewLoan);

describe('NewLoan', () => {
  it('turns the selected ids into numbers and keeps an empty due date empty', () => {
    expect(decode({ bookId: '2', memberId: '3', dueDate: '' })).toEqual({
      bookId: 2,
      memberId: 3,
      dueDate: '',
    });
  });

  it('accepts a due date', () => {
    expect(decode({ bookId: '2', memberId: '3', dueDate: '2026-12-01' }).dueDate).toBe(
      '2026-12-01',
    );
  });

  it('asks for a book and a member when none is selected', () => {
    expect(() => decode({ bookId: '', memberId: '3', dueDate: '' })).toThrow('Select a book');
    expect(() => decode({ bookId: '2', memberId: '', dueDate: '' })).toThrow('Select a member');
  });

  it('rejects a due date that is not YYYY-MM-DD', () => {
    expect(() => decode({ bookId: '2', memberId: '3', dueDate: '1/12/2026' })).toThrow(
      'Enter a valid due date',
    );
  });
});

describe('Loan', () => {
  const loan = {
    id: 1,
    bookId: 2,
    memberId: 3,
    bookTitle: 'Dune',
    memberName: 'Ben Okafor',
    borrowedAt: '2026-10-01',
    dueDate: '2026-10-15',
    returnedAt: null,
    status: 'overdue',
  };

  it('decodes an open and a returned loan', () => {
    const decodeLoan = Schema.decodeUnknownSync(Loan);
    expect(decodeLoan(loan).returnedAt).toBeNull();
    expect(decodeLoan({ ...loan, returnedAt: '2026-10-20', status: 'returned' }).returnedAt).toBe(
      '2026-10-20',
    );
  });

  it('rejects a status the API does not define', () => {
    expect(() => Schema.decodeUnknownSync(Loan)({ ...loan, status: 'lost' })).toThrow();
  });
});
