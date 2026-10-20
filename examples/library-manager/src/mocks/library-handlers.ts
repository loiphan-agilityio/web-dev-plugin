import type { RequestHandler } from 'msw';

import { createBooksHandlers } from '@/features/books/mocks';
import { createLoansHandlers } from '@/features/loans/mocks';
import { createMembersHandlers } from '@/features/members/mocks';

import { createLibraryDb, type LibraryDb } from './library-db';

/**
 * All three features' handlers over one db, for the app and for tests that cross features (the
 * lend form reads books and members, a return changes a book's copies).
 */
export const createLibraryHandlers = (db: LibraryDb = createLibraryDb()): RequestHandler[] => [
  ...createBooksHandlers(db),
  ...createMembersHandlers(db),
  ...createLoansHandlers(db),
];
