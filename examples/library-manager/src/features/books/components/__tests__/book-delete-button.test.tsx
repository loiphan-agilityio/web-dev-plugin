import { screen } from '@testing-library/react';

import { server } from '@/mocks/server';
import { createLibraryDb } from '@/mocks/library-db';
import { bookFixtures } from '@/mocks/library-fixtures';
import { renderWithProviders } from '@/test/render';

import { booksMocks, createBooksHandlers } from '../../mocks';
import { BookDeleteButton } from '../book-delete-button';

const book = bookFixtures[3];
assert(book, 'the fixtures hold a book that is not on loan');

describe('BookDeleteButton', () => {
  it('asks for confirmation, then deletes and shows a toast', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: bookFixtures })));
    const { user } = renderWithProviders(<BookDeleteButton book={book} />);

    await user.click(screen.getByRole('button', { name: `Delete ${book.title}` }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(book.title);
    await user.click(screen.getByRole('button', { name: 'Delete book' }));

    expect(await screen.findByText('Book deleted')).toBeInTheDocument();
  });

  it('does nothing when the user cancels', async () => {
    const { user } = renderWithProviders(<BookDeleteButton book={book} />);

    await user.click(screen.getByRole('button', { name: `Delete ${book.title}` }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Book deleted')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and shows the reason when the book has active loans', async () => {
    server.use(booksMocks.deleteConflict('This book has active loans and cannot be deleted.'));
    const { user } = renderWithProviders(<BookDeleteButton book={book} />);

    await user.click(screen.getByRole('button', { name: `Delete ${book.title}` }));
    await user.click(await screen.findByRole('button', { name: 'Delete book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This book has active loans and cannot be deleted.',
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete book' })).toBeEnabled();
  });

  it('shows a message when the book is already gone', async () => {
    server.use(booksMocks.deleteNotFound());
    const { user } = renderWithProviders(<BookDeleteButton book={book} />);

    await user.click(screen.getByRole('button', { name: `Delete ${book.title}` }));
    await user.click(await screen.findByRole('button', { name: 'Delete book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not find');
  });
});
