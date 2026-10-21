import { screen } from '@testing-library/react';

import { Button } from '@/components/ui/button';
import { renderWithProviders } from '@/test/render';

import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('shows the message and is not an alert', async () => {
    renderWithProviders(<EmptyState message="No todos yet. Add the first one above." />);
    expect(await screen.findByText('No todos yet. Add the first one above.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the action when given', async () => {
    renderWithProviders(
      <EmptyState message="No todos yet." action={<Button type="button">Add a todo</Button>} />,
    );
    expect(await screen.findByRole('button', { name: 'Add a todo' })).toBeInTheDocument();
  });
});
