import { screen, waitFor } from '@testing-library/react';

import { server } from '@/mocks/server';
import { createLibraryDb } from '@/mocks/library-db';
import { bookFixtures } from '@/mocks/library-fixtures';
import { renderWithProviders } from '@/test/render';

import { booksMocks, createBooksHandlers } from '../../mocks';
import { BookForm } from '../book-form';

const [dune] = bookFixtures;
assert(dune, 'the fixtures start with a book');

const fillNewBook = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.type(screen.getByLabelText('Title'), 'Emma');
  await user.type(screen.getByLabelText('Author'), 'Jane Austen');
  await user.type(screen.getByLabelText('ISBN'), '9780141439587');
};

describe('BookForm', () => {
  it('validates on the client', async () => {
    const { user } = renderWithProviders(<BookForm />);

    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Author is required')).toBeInTheDocument();
    expect(screen.getByText('ISBN is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects an ISBN that is not 10 or 13 digits and copies outside 1 to 99', async () => {
    const { user } = renderWithProviders(<BookForm />);
    await fillNewBook(user);
    await user.clear(screen.getByLabelText('ISBN'));
    await user.type(screen.getByLabelText('ISBN'), '123');
    await user.clear(screen.getByLabelText('Total copies'));
    await user.type(screen.getByLabelText('Total copies'), '100');

    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('ISBN must have 10 or 13 digits')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number from 1 to 99')).toBeInTheDocument();
  });

  it('clears the form and shows a toast after a successful create', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: [] })));
    const { user } = renderWithProviders(<BookForm />);
    await fillNewBook(user);

    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText('Book created')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });
    expect(screen.getByLabelText('Total copies')).toHaveValue(1);
  });

  it('shows a server field error under the input', async () => {
    server.use(
      booksMocks.createInvalid({ isbn: 'A book with this ISBN is already in the catalogue' }),
    );
    const { user } = renderWithProviders(<BookForm />);
    await fillNewBook(user);

    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(
      await screen.findByText('A book with this ISBN is already in the catalogue'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('ISBN')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a server failure above the button and lets the user retry', async () => {
    server.use(booksMocks.createError(500));
    const { user } = renderWithProviders(<BookForm />);
    await fillNewBook(user);

    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side');
    expect(screen.getByRole('button', { name: 'Add book' })).toBeEnabled();
  });

  it('edits a book: prefilled, saved, and the page is told it is done', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: bookFixtures })));
    const onDone = vi.fn();
    const { user } = renderWithProviders(<BookForm book={dune} onDone={onDone} />);
    expect(screen.getByLabelText('Title')).toHaveValue('Dune');
    expect(screen.getByLabelText('Total copies')).toHaveValue(3);

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Dune Messiah');
    await user.click(screen.getByRole('button', { name: 'Save book' }));

    expect(await screen.findByText('Book updated')).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('shows a server error when an edit takes copies below the number on loan', async () => {
    server.use(
      booksMocks.updateInvalid({ totalCopies: '2 copies are on loan, so keep at least 2' }),
    );
    const { user } = renderWithProviders(<BookForm book={dune} />);

    await user.clear(screen.getByLabelText('Total copies'));
    await user.type(screen.getByLabelText('Total copies'), '1');
    await user.click(screen.getByRole('button', { name: 'Save book' }));

    expect(await screen.findByText('2 copies are on loan, so keep at least 2')).toBeInTheDocument();
  });

  it('cancels an edit', async () => {
    const onDone = vi.fn();
    const { user } = renderWithProviders(<BookForm book={dune} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDone).toHaveBeenCalledOnce();
  });
});
