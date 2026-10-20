import { Schema } from 'effect';

/** A book as the API returns it. `availableCopies` is the server's: totalCopies minus open loans. */
export const Book = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  author: Schema.String,
  isbn: Schema.String,
  category: Schema.String,
  totalCopies: Schema.Number,
  availableCopies: Schema.Number,
  createdAt: Schema.String,
});
export type Book = typeof Book.Type;

export const BookList = Schema.Array(Book);

// 10 or 13 digits, hyphens allowed anywhere between them.
const isbnPattern = /^(?=[\d-]+$)(?:-*\d){10}(?:(?:-*\d){3})?-*$/;

/**
 * The create / edit form. The copies field holds text and decodes to a number, so `Encoded`
 * (`NewBookInput`, what the form holds) differs from `Type` (`NewBook`, what the API gets).
 */
export const NewBook = Schema.Struct({
  title: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Title is required' }),
      Schema.isMaxLength(200, { message: 'Keep the title under 200 characters' }),
    ),
  ),
  author: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'Author is required' }),
      Schema.isMaxLength(120, { message: 'Keep the author under 120 characters' }),
    ),
  ),
  isbn: Schema.Trim.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: 'ISBN is required' }),
      Schema.isPattern(isbnPattern, { message: 'ISBN must have 10 or 13 digits' }),
    ),
  ),
  category: Schema.Trim.pipe(
    Schema.check(Schema.isMaxLength(60, { message: 'Keep the category under 60 characters' })),
  ),
  totalCopies: Schema.NumberFromString.pipe(
    Schema.check(
      Schema.isInt({ message: 'Enter a whole number from 1 to 99' }),
      Schema.isBetween(
        { minimum: 1, maximum: 99 },
        { message: 'Enter a whole number from 1 to 99' },
      ),
    ),
  ),
});
export type NewBook = typeof NewBook.Type;
export type NewBookInput = typeof NewBook.Encoded;
