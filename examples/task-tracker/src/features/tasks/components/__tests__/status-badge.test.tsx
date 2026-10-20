import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  it.each([
    ['todo', 'To do'],
    ['in_progress', 'In progress'],
    ['done', 'Done'],
  ] as const)('shows the label of %s', (status, label) => {
    renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
