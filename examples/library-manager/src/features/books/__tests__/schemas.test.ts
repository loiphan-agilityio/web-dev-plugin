import { Schema } from 'effect';

import { NewBook } from '../schemas';

const decode = Schema.decodeUnknownSync(NewBook);

const valid = {
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: '9780441172719',
  category: 'Science fiction',
  totalCopies: '3',
};

describe('NewBook', () => {
  it('trims the text fields and turns the copies into a number', () => {
    expect(decode({ ...valid, title: '  Dune  ', author: ' Frank Herbert ' })).toEqual({
      ...valid,
      totalCopies: 3,
    });
  });

  it('allows an empty category', () => {
    expect(decode({ ...valid, category: '   ' }).category).toBe('');
  });

  it.each([
    ['title', { title: '   ' }, 'Title is required'],
    ['title', { title: 'x'.repeat(201) }, 'Keep the title under 200 characters'],
    ['author', { author: '' }, 'Author is required'],
    ['isbn', { isbn: '' }, 'ISBN is required'],
    ['isbn', { isbn: '12345' }, 'ISBN must have 10 or 13 digits'],
    ['isbn', { isbn: '97804411727190' }, 'ISBN must have 10 or 13 digits'],
    ['isbn', { isbn: '978-0-441-1727x9' }, 'ISBN must have 10 or 13 digits'],
    ['category', { category: 'x'.repeat(61) }, 'Keep the category under 60 characters'],
    ['totalCopies', { totalCopies: '0' }, 'Enter a whole number from 1 to 99'],
    ['totalCopies', { totalCopies: '100' }, 'Enter a whole number from 1 to 99'],
    ['totalCopies', { totalCopies: '1.5' }, 'Enter a whole number from 1 to 99'],
  ])('rejects a bad %s', (_field, change, message) => {
    expect(() => decode({ ...valid, ...change })).toThrow(message);
  });

  it.each(['0441172719', '978-0-441-17271-9', ' 9780441172719 '])('accepts the ISBN %s', (isbn) => {
    expect(() => decode({ ...valid, isbn })).not.toThrow();
  });

  it('rejects copies that are not a number', () => {
    expect(() => decode({ ...valid, totalCopies: 'abc' })).toThrow();
    expect(() => decode({ ...valid, totalCopies: '' })).toThrow();
  });
});
