import { screen, waitFor, within } from '@testing-library/react';

import { createLibraryHandlers } from '@/mocks/library-handlers';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

const statValue = (label: string) => {
  const index = screen.getAllByRole('term').findIndex(({ textContent }) => textContent === label);
  return screen.getAllByRole('definition')[index];
};

// StatCards and OverdueTable test their own states; this checks one return updates both.
describe('OverviewPage', () => {
  it('updates the numbers and the table after an overdue loan is returned', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderRoute('/overview');
    const table = await screen.findByRole('table', { name: 'Overdue loans' });
    await screen.findAllByRole('term');
    expect(statValue('Overdue loans')).toHaveTextContent('3');
    expect(statValue('Active loans')).toHaveTextContent('6');

    await user.click(
      within(table).getByRole('button', { name: 'Return Neuromancer (Daniel Reyes)' }),
    );

    await waitFor(() => {
      expect(statValue('Overdue loans')).toHaveTextContent('2');
    });
    expect(statValue('Active loans')).toHaveTextContent('5');
    expect(within(table).queryByText('Daniel Reyes')).not.toBeInTheDocument();
  });
});
