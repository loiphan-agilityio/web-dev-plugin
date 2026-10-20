import { screen, within } from '@testing-library/react';

import { createTasksHandlers, taskFixtures, tasksMocks } from '@/features/tasks/mocks';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { StatsCards } from '../stats-cards';

const count = async (label: string) => {
  const list = await screen.findByRole('list', { name: 'Task counts' });
  const item = within(list)
    .getAllByRole('listitem')
    .find((element) => within(element).queryByText(label) !== null);
  if (!item) {
    throw new Error(`No card for ${label}`);
  }
  return item.textContent;
};

describe('StatsCards', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.statsPending());
    renderWithProviders(<StatsCards />);
    expect(await screen.findByRole('status', { name: 'Loading stats' })).toBeInTheDocument();
  });

  it('shows every count from the stats', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<StatsCards />);
    expect(await count('Total tasks')).toBe('Total tasks8');
    expect(await count('In progress')).toBe('In progress2');
    expect(await count('Done')).toBe('Done2');
    expect(await count('Overdue')).toBe('Overdue3');
  });

  it('shows the completion rate as a progress bar', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<StatsCards />);
    const bar = await screen.findByRole('progressbar', { name: 'Completion rate' });
    expect(bar).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('2 of 8 done · 25%')).toBeInTheDocument();
  });

  it('shows zeros, not an error, when there are no tasks', async () => {
    server.use(...createTasksHandlers([]));
    renderWithProviders(<StatsCards />);
    expect(await count('Total tasks')).toBe('Total tasks0');
    expect(screen.getByRole('progressbar', { name: 'Completion rate' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.getByText('0 of 0 done · 0%')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.statsError(500));
    const { user } = renderWithProviders(<StatsCards />);
    expect(await screen.findByText('Could not load the stats')).toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await count('Total tasks')).toBe('Total tasks8');
  });
});
