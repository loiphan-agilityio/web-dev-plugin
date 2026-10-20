import { screen, within } from '@testing-library/react';

import { createLibraryDb } from '@/mocks/library-db';
import { loanFixtures } from '@/mocks/library-fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createLoansHandlers, loansMocks } from '../../mocks';
import { LoanList } from '../loan-list';

const withLoans = () => {
  server.use(...createLoansHandlers(createLibraryDb({ loans: loanFixtures })));
};

const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1);

describe('LoanList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(loansMocks.listPending());
    renderWithProviders(<LoanList />);
    expect(await screen.findByRole('status', { name: 'Loading loans' })).toBeInTheDocument();
  });

  it('lists open loans by due date, then returned loans, each with its status', async () => {
    withLoans();
    renderWithProviders(<LoanList />);

    const table = await screen.findByRole('table', { name: 'Loans' });
    const rows = bodyRows(table);
    expect(rows).toHaveLength(loanFixtures.length);
    // Open loans by due date (most overdue first), then returned loans, the latest return first.
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'The Hobbit',
      'Neuromancer',
      'Neuromancer',
      'Dune',
      'Sapiens',
      'Dune',
      'Educated',
      'The Left Hand of Darkness',
      'Pride and Prejudice',
    ]);
    const hobbit = within(table).getByRole('row', { name: /The Hobbit/ });
    expect(within(hobbit).getByText('Ben Okafor')).toBeInTheDocument();
    expect(within(hobbit).getByText('15 days overdue')).toBeInTheDocument();
    expect(within(hobbit).getByText('Overdue')).toBeInTheDocument();
    const sapiens = within(table).getByRole('row', { name: /Sapiens/ });
    expect(within(sapiens).getByText('Active')).toBeInTheDocument();
    for (const row of rows.slice(-3)) {
      expect(within(row).getByText('Returned')).toBeInTheDocument();
      expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    }
    expect(within(table).getAllByRole('button', { name: /^Return / })).toHaveLength(6);
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createLoansHandlers(createLibraryDb({ loans: [] })));
    renderWithProviders(<LoanList />);
    expect(await screen.findByText(/No loans yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(loansMocks.listError(500));
    const { user } = renderWithProviders(<LoanList />);
    expect(await screen.findByText('Could not load loans')).toBeInTheDocument();

    withLoans();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Loans' })).toBeInTheDocument();
  });

  it('filters by status with the tabs and keeps the status in the URL', async () => {
    withLoans();
    const { user, router } = renderWithProviders(<LoanList />);
    await screen.findByRole('table', { name: 'Loans' });
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Overdue' }));

    const rows = bodyRows(screen.getByRole('table', { name: 'Loans' }));
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(within(row).getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overdue' })).toHaveAttribute('aria-pressed', 'true');
    expect(router.state.location.search).toBe('?status=overdue');

    await user.click(screen.getByRole('button', { name: 'Returned' }));
    expect(bodyRows(screen.getByRole('table', { name: 'Loans' }))).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(bodyRows(screen.getByRole('table', { name: 'Loans' }))).toHaveLength(9);
    expect(router.state.location.search).toBe('');
  });

  it('searches by book or member', async () => {
    withLoans();
    const { user, router } = renderWithProviders(<LoanList />);
    await screen.findByRole('table', { name: 'Loans' });

    await user.type(screen.getByRole('searchbox', { name: 'Search loans' }), 'daniel');

    const rows = bodyRows(screen.getByRole('table', { name: 'Loans' }));
    expect(rows).toHaveLength(2);
    expect(router.state.location.search).toBe('?q=daniel');
  });

  it('says when nothing matches and clears the filters', async () => {
    withLoans();
    const { user, router } = renderWithProviders(<LoanList />);
    await screen.findByRole('table', { name: 'Loans' });

    await user.type(screen.getByRole('searchbox', { name: 'Search loans' }), 'zzz');
    expect(screen.getByText('No loans match your filters.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('table', { name: 'Loans' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('records a return from the row and shows the loan as returned', async () => {
    withLoans();
    const { user } = renderWithProviders(<LoanList />);
    await screen.findByRole('table', { name: 'Loans' });

    await user.click(screen.getByRole('button', { name: 'Return The Hobbit (Ben Okafor)' }));

    expect(await screen.findByText('Return recorded')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Return The Hobbit (Ben Okafor)' }),
    ).not.toBeInTheDocument();
    // Three loans were already returned, and the Returned tab is a button, not a badge.
    const table = screen.getByRole('table', { name: 'Loans' });
    expect(within(table).getAllByText('Returned')).toHaveLength(4);
  });
});
