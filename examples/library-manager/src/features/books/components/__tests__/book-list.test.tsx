import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { createLibraryDb } from '@/mocks/library-db';
import { bookFixtures } from '@/mocks/library-fixtures';
import { renderWithProviders } from '@/test/render';

import { booksMocks, createBooksHandlers } from '../../mocks';
import { BookList } from '../book-list';

const withBooks = () => {
  server.use(...createBooksHandlers(createLibraryDb({ books: bookFixtures })));
};

describe('BookList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(booksMocks.listPending());
    renderWithProviders(<BookList onEdit={vi.fn()} />);
    expect(await screen.findByRole('status', { name: 'Loading books' })).toBeInTheDocument();
  });

  it('shows every book with its copies, a missing category and an unavailable badge', async () => {
    withBooks();
    renderWithProviders(<BookList onEdit={vi.fn()} />);

    const table = await screen.findByRole('table', { name: 'Books' });
    expect(within(table).getAllByRole('row')).toHaveLength(bookFixtures.length + 1);

    const dune = within(table).getByRole('row', { name: /Dune/ });
    expect(within(dune).getByText('1 / 3')).toBeInTheDocument();
    expect(within(dune).queryByText('Unavailable')).not.toBeInTheDocument();

    const neuromancer = within(table).getByRole('row', { name: /Neuromancer/ });
    expect(within(neuromancer).getByText('0 / 2')).toBeInTheDocument();
    expect(within(neuromancer).getByText('Unavailable')).toBeInTheDocument();

    const sapiens = within(table).getByRole('row', { name: /Sapiens/ });
    expect(within(sapiens).getByText('Uncategorised')).toBeInTheDocument();
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createBooksHandlers(createLibraryDb({ books: [] })));
    renderWithProviders(<BookList onEdit={vi.fn()} />);
    expect(await screen.findByText(/No books yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(booksMocks.listError(500));
    const { user } = renderWithProviders(<BookList onEdit={vi.fn()} />);
    expect(await screen.findByText('Could not load books')).toBeInTheDocument();

    withBooks();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Books' })).toBeInTheDocument();
  });

  it('searches by title, author or ISBN and keeps the search in the URL', async () => {
    withBooks();
    const { user, router } = renderWithProviders(<BookList onEdit={vi.fn()} />);
    await screen.findByRole('table', { name: 'Books' });

    await user.type(screen.getByRole('searchbox', { name: 'Search books' }), 'herbert');

    const table = screen.getByRole('table', { name: 'Books' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Dune')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=herbert');
  });

  it('filters to the books that are available now, in the URL', async () => {
    withBooks();
    const { user, router } = renderWithProviders(<BookList onEdit={vi.fn()} />);
    await screen.findByRole('table', { name: 'Books' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Availability' }), 'available');

    expect(screen.queryByText('Neuromancer')).not.toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?availability=available');
  });

  it('says when nothing matches and clears the filters', async () => {
    withBooks();
    const { user, router } = renderWithProviders(<BookList onEdit={vi.fn()} />);
    await screen.findByRole('table', { name: 'Books' });

    await user.type(screen.getByRole('searchbox', { name: 'Search books' }), 'zzz');
    expect(screen.getByText('No books match your filters.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('table', { name: 'Books' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('hands the book to onEdit', async () => {
    withBooks();
    const onEdit = vi.fn();
    const { user } = renderWithProviders(<BookList onEdit={onEdit} />);

    await user.click(await screen.findByRole('button', { name: 'Edit Dune' }));

    expect(onEdit).toHaveBeenCalledWith(bookFixtures[0]);
  });
});
