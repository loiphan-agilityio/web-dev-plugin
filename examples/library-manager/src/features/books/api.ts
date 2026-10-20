import { Effect } from 'effect';

import { ApiClient } from '@/lib/api/client';

import { Book, BookList, type NewBook } from './schemas';

export const listBooks = Effect.fn('books.list')(function* () {
  const api = yield* ApiClient;
  return yield* api.get('/books', BookList);
});

export const createBook = Effect.fn('books.create')(function* (input: NewBook) {
  const api = yield* ApiClient;
  return yield* api.post('/books', input, Book);
});

export const updateBook = Effect.fn('books.update')(function* (id: number, input: NewBook) {
  const api = yield* ApiClient;
  return yield* api.patch(`/books/${id}`, input, Book);
});

export const deleteBook = Effect.fn('books.delete')(function* (id: number) {
  const api = yield* ApiClient;
  return yield* api.delete(`/books/${id}`);
});
