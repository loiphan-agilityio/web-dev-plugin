import { screen, waitFor, within } from '@testing-library/react';

import { createLibraryHandlers } from '@/mocks/library-handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { loansMocks } from '../../mocks';
import { LoanForm } from '../loan-form';

const lend = async (
  user: ReturnType<typeof renderWithProviders>['user'],
  book = 'Dune (1 available)',
  member = 'Amelia Hart',
) => {
  await screen.findByRole('option', { name: book });
  await user.selectOptions(screen.getByLabelText('Book'), book);
  await user.selectOptions(screen.getByLabelText('Member'), member);
};

describe('LoanForm', () => {
  it('offers only books with a copy available and members who are not suspended', async () => {
    server.use(...createLibraryHandlers());
    renderWithProviders(<LoanForm />);

    await screen.findByRole('option', { name: 'Dune (1 available)' });
    const books = within(screen.getByLabelText('Book'));
    expect(books.queryByRole('option', { name: /Neuromancer/ })).not.toBeInTheDocument();
    expect(books.getAllByRole('option')).toHaveLength(8);
    const members = within(screen.getByLabelText('Member'));
    expect(members.queryByRole('option', { name: 'Elena Petrova' })).not.toBeInTheDocument();
    expect(members.getAllByRole('option')).toHaveLength(6);
  });

  it('asks for a book and a member', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderWithProviders(<LoanForm />);

    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    expect(await screen.findByText('Select a book')).toBeInTheDocument();
    expect(screen.getByText('Select a member')).toBeInTheDocument();
    expect(screen.getByLabelText('Book')).toHaveAttribute('aria-invalid', 'true');
  });

  it('lends the book, clears the form and shows a toast', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderWithProviders(<LoanForm />);
    await lend(user);

    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    expect(await screen.findByText('Book lent')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Book')).toHaveValue('');
    });
    expect(screen.getByLabelText('Member')).toHaveValue('');
  });

  it('takes the book off the list when its last copy is lent', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderWithProviders(<LoanForm />);
    await lend(user);

    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Dune/ })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'The Hobbit (1 available)' })).toBeInTheDocument();
  });

  it('shows a server error under the due date', async () => {
    server.use(...createLibraryHandlers());
    server.use(loansMocks.createInvalid({ dueDate: 'The due date cannot be in the past' }));
    const { user } = renderWithProviders(<LoanForm />);
    await lend(user);
    await user.type(screen.getByLabelText('Due date'), '2020-01-01');

    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    expect(await screen.findByText('The due date cannot be in the past')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a server field error under the book', async () => {
    server.use(...createLibraryHandlers());
    server.use(loansMocks.createInvalid({ bookId: 'No copies of this book are available' }));
    const { user } = renderWithProviders(<LoanForm />);
    await lend(user);

    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    expect(await screen.findByText('No copies of this book are available')).toBeInTheDocument();
  });

  it('shows a server failure above the button and lets the user retry', async () => {
    server.use(...createLibraryHandlers());
    server.use(loansMocks.createError(500));
    const { user } = renderWithProviders(<LoanForm />);
    await lend(user);

    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side');
    expect(screen.getByRole('button', { name: 'Lend book' })).toBeEnabled();
  });
});
