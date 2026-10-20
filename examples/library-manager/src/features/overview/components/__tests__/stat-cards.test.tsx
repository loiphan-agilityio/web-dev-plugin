import { screen } from '@testing-library/react';

import { loansMocks } from '@/features/loans/mocks';
import { createLibraryHandlers } from '@/mocks/library-handlers';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { StatCards } from '../stat-cards';

describe('StatCards', () => {
  it('shows a loading state before the first response', async () => {
    server.use(loansMocks.statsPending());
    renderWithProviders(<StatCards />);
    expect(await screen.findByRole('status', { name: 'Loading statistics' })).toBeInTheDocument();
  });

  it('shows the five numbers of the library', async () => {
    server.use(...createLibraryHandlers());
    renderWithProviders(<StatCards />);

    await screen.findAllByRole('term');
    const numbers = Object.fromEntries(
      screen
        .getAllByRole('term')
        .map((term, index) => [
          term.textContent,
          screen.getAllByRole('definition')[index]?.textContent,
        ]),
    );
    expect(numbers).toEqual({
      Books: '8',
      Members: '6',
      'Active loans': '6',
      'Overdue loans': '3',
      'Due this week': '3',
    });
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(loansMocks.statsError(500));
    const { user } = renderWithProviders(<StatCards />);
    expect(await screen.findByText('Could not load the statistics')).toBeInTheDocument();

    server.use(...createLibraryHandlers());
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Overdue loans')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
