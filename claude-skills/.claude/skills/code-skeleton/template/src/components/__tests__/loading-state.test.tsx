import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { LoadingState } from '../loading-state';

describe('LoadingState', () => {
  it('announces what is loading', async () => {
    renderWithProviders(<LoadingState label="Loading todos" />);
    expect(await screen.findByRole('status', { name: 'Loading todos' })).toBeInTheDocument();
  });

  it('renders the requested number of placeholder rows', async () => {
    renderWithProviders(<LoadingState label="Loading todos" rows={5} />);
    const status = await screen.findByRole('status', { name: 'Loading todos' });
    expect(status.children).toHaveLength(5);
  });
});
