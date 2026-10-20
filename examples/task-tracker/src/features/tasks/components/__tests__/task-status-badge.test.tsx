import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { TaskStatusBadge } from '../task-status-badge';

describe('TaskStatusBadge', () => {
  it.each([
    ['todo', 'To do'],
    ['in_progress', 'In progress'],
    ['done', 'Done'],
  ] as const)('shows the label of %s', (status, label) => {
    renderWithProviders(<TaskStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
