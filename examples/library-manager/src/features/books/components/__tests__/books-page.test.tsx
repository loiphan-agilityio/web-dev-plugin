import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { createLibraryDb } from '@/mocks/library-db';
import { bookFixtures } from '@/mocks/library-fixtures';
import { renderRoute } from '@/test/render';

import { createBooksHandlers } from '../../mocks';

// BookList, BookForm and BookDeleteButton test their own states; this checks they work together.
describe('BooksPage', () => {
  it('shows a new book in the list after it is created', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: [] })));
    const { user } = renderRoute('/books');
    await screen.findByText(/No books yet/);

    await user.type(screen.getByLabelText('Title'), '  Emma ');
    await user.type(screen.getByLabelText('Author'), 'Jane Austen');
    await user.type(screen.getByLabelText('ISBN'), '9780141439587');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    const table = await screen.findByRole('table', { name: 'Books' });
    expect(within(table).getByText('Emma')).toBeInTheDocument();
    expect(within(table).getByText('1 / 1')).toBeInTheDocument();
  });

  it('edits a book in the form above the list and shows the change', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: bookFixtures })));
    const { user } = renderRoute('/books');

    await user.click(await screen.findByRole('button', { name: 'Edit Clean Code' }));
    expect(screen.getByRole('heading', { name: 'Edit book' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Clean Code');

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Clean Architecture');
    await user.click(screen.getByRole('button', { name: 'Save book' }));

    expect(await screen.findByText('Clean Architecture')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add a book' })).toBeInTheDocument();
    expect(screen.queryByText('Clean Code')).not.toBeInTheDocument();
  });

  it('removes a deleted book from the list', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: bookFixtures })));
    const { user } = renderRoute('/books');

    await user.click(await screen.findByRole('button', { name: 'Delete Clean Code' }));
    await user.click(await screen.findByRole('button', { name: 'Delete book' }));

    expect(await screen.findByText('Book deleted')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Clean Code/ })).not.toBeInTheDocument();
  });

  it('refuses to delete a book that is on loan and says why', async () => {
    server.use(...createBooksHandlers());
    const { user } = renderRoute('/books');

    await user.click(await screen.findByRole('button', { name: 'Delete Dune' }));
    await user.click(await screen.findByRole('button', { name: 'Delete book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('active loans');
    // While the dialog is open the rest of the page is hidden from assistive technology.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('row', { name: /Dune/ })).toBeInTheDocument();
  });
});
