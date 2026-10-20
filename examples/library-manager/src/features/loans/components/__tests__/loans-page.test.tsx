import { screen, within } from '@testing-library/react';

import { createLibraryHandlers } from '@/mocks/library-handlers';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

// LoanForm, LoanList and LoanReturnButton test their own states; this checks they work together.
describe('LoansPage', () => {
  it('shows a new loan in the list after the book is lent', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderRoute('/loans');
    await screen.findByRole('table', { name: 'Loans' });
    await screen.findByRole('option', { name: 'The Left Hand of Darkness (1 available)' });

    await user.selectOptions(
      screen.getByLabelText('Book'),
      'The Left Hand of Darkness (1 available)',
    );
    await user.selectOptions(screen.getByLabelText('Member'), 'Chloe Nguyen');
    await user.click(screen.getByRole('button', { name: 'Lend book' }));

    expect(await screen.findByText('Book lent')).toBeInTheDocument();
    // The book was lent before (a returned loan), so pick the row of this member.
    const row = await screen.findByRole('row', {
      name: /The Left Hand of Darkness Chloe Nguyen/,
    });
    expect(within(row).getByText('Chloe Nguyen')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('makes a returned copy available to lend again', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderRoute('/loans');
    await screen.findByRole('table', { name: 'Loans' });
    // Both copies of Neuromancer are out, so it cannot be chosen yet.
    expect(screen.queryByRole('option', { name: /Neuromancer/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Return Neuromancer (Daniel Reyes)' }));

    expect(await screen.findByText('Return recorded')).toBeInTheDocument();
    expect(
      await screen.findByRole('option', { name: 'Neuromancer (1 available)' }),
    ).toBeInTheDocument();
  });

  it('shows the overdue loans when the Overdue tab is chosen', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderRoute('/loans');
    await screen.findByRole('table', { name: 'Loans' });

    await user.click(screen.getByRole('button', { name: 'Overdue' }));

    const table = screen.getByRole('table', { name: 'Loans' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('15 days overdue')).toBeInTheDocument();
  });
});
