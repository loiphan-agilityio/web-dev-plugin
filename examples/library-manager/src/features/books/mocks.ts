import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw/utils/delay';

import { config } from '@/lib/config';
import { createLibraryDb, type LibraryDb, nextId, openLoans } from '@/mocks/library-db';

import type { Book, NewBook } from './schemas';

const url = (path: string) => `${config.apiUrl}${path}`;

const invalid = (errors: Record<string, string>) =>
  HttpResponse.json({ message: 'Validation failed', errors }, { status: 422 });

/**
 * The books half of the in-memory backend. `db` is shared with the members and loans handlers
 * (a loan changes a book's copies); with no argument it is a fresh copy of the fixtures.
 */
export const createBooksHandlers = (db: LibraryDb = createLibraryDb()) => [
  http.get(url('/books'), () => HttpResponse.json(db.books)),
  http.post<never, NewBook>(url('/books'), async ({ request }) => {
    const input = await request.json();
    if (db.books.some(({ isbn }) => isbn === input.isbn)) {
      return invalid({ isbn: 'A book with this ISBN is already in the catalogue' });
    }
    const book: Book = {
      id: nextId(db.books),
      ...input,
      availableCopies: input.totalCopies,
      createdAt: new Date().toISOString(),
    };
    db.books.push(book);
    return HttpResponse.json(book, { status: 201 });
  }),
  http.patch<{ id: string }, NewBook>(url('/books/:id'), async ({ params, request }) => {
    const book = db.books.find(({ id }) => id === Number(params.id));
    if (!book) return HttpResponse.json({ message: 'Book not found' }, { status: 404 });
    const input = await request.json();
    if (db.books.some(({ id, isbn }) => id !== book.id && isbn === input.isbn)) {
      return invalid({ isbn: 'A book with this ISBN is already in the catalogue' });
    }
    const onLoan = openLoans(db, { bookId: book.id }).length;
    if (input.totalCopies < onLoan) {
      return invalid({ totalCopies: `${onLoan} copies are on loan, so keep at least ${onLoan}` });
    }
    Object.assign(book, input, { availableCopies: input.totalCopies - onLoan });
    return HttpResponse.json(book);
  }),
  http.delete<{ id: string }>(url('/books/:id'), ({ params }) => {
    const index = db.books.findIndex(({ id }) => id === Number(params.id));
    const book = db.books[index];
    if (!book) return HttpResponse.json({ message: 'Book not found' }, { status: 404 });
    if (openLoans(db, { bookId: book.id }).length > 0) {
      return HttpResponse.json(
        { message: 'This book has active loans and cannot be deleted.' },
        { status: 409 },
      );
    }
    db.books.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

/** One-off responses for the states a test or story needs to drive. */
export const booksMocks = {
  listPending: () =>
    http.get(url('/books'), async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    }),
  listError: (status = 500) =>
    http.get(url('/books'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  createInvalid: (errors: Record<string, string>) =>
    http.post(url('/books'), () => invalid(errors)),
  createError: (status = 500) =>
    http.post(url('/books'), () => HttpResponse.json({ message: 'Boom' }, { status })),
  updateInvalid: (errors: Record<string, string>) =>
    http.patch(url('/books/:id'), () => invalid(errors)),
  deleteConflict: (message = 'This book has active loans and cannot be deleted.') =>
    http.delete(url('/books/:id'), () => HttpResponse.json({ message }, { status: 409 })),
  deleteNotFound: () =>
    http.delete(url('/books/:id'), () =>
      HttpResponse.json({ message: 'Not found' }, { status: 404 }),
    ),
};
