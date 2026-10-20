import { screen, within } from '@testing-library/react';

import { createLoansHandlers, loansMocks } from '@/features/loans/mocks';
import { createLibraryDb } from '@/mocks/library-db';
import { loanFixtures } from '@/mocks/library-fixtures';
import { createLibraryHandlers } from '@/mocks/library-handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { OverdueTable } from '../overdue-table';

describe('OverdueTable', () => {
  it('shows a loading state before the first response', async () => {
    server.use(loansMocks.listPending());
    renderWithProviders(<OverdueTable />);
    expect(
      await screen.findByRole('status', { name: 'Loading overdue loans' }),
    ).toBeInTheDocument();
  });

  it('lists only the overdue loans, the longest overdue first', async () => {
    server.use(...createLibraryHandlers());
    renderWithProviders(<OverdueTable />);

    const table = await screen.findByRole('table', { name: 'Overdue loans' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map(({ textContent }) => textContent),
      ),
    ).toEqual([
      ['The Hobbit', 'Ben Okafor', expect.any(String), '15', 'Return'],
      ['Neuromancer', 'Daniel Reyes', expect.any(String), '7', 'Return'],
      ['Neuromancer', 'Amelia Hart', expect.any(String), '4', 'Return'],
    ]);
    expect(screen.queryByText('Dune')).not.toBeInTheDocument();
  });

  it('says there is nothing overdue, and that is not an error', async () => {
    const onTime = loanFixtures.filter(({ status }) => status !== 'overdue');
    server.use(...createLoansHandlers(createLibraryDb({ loans: onTime })));
    renderWithProviders(<OverdueTable />);

    expect(await screen.findByText('No overdue loans.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(loansMocks.listError(500));
    const { user } = renderWithProviders(<OverdueTable />);
    expect(await screen.findByText('Could not load the overdue loans')).toBeInTheDocument();

    server.use(...createLibraryHandlers());
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('table', { name: 'Overdue loans' })).toBeInTheDocument();
  });

  it('records a return and drops the loan from the table', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderWithProviders(<OverdueTable />);
    await screen.findByRole('table', { name: 'Overdue loans' });

    await user.click(screen.getByRole('button', { name: 'Return The Hobbit (Ben Okafor)' }));

    expect(await screen.findByText('Return recorded')).toBeInTheDocument();
    expect(await screen.findAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText('The Hobbit')).not.toBeInTheDocument();
  });
});
