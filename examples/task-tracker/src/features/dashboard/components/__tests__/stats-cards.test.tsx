import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { createTasksHandlers, taskFixtures, tasksMocks } from '@/features/tasks/mocks';

import { StatsCards } from '../stats-cards';

const countOf = (label: string) =>
  within(screen.getByRole('listitem', { name: label }));

describe('StatsCards', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.statsPending());
    renderWithProviders(<StatsCards />);
    expect(await screen.findByRole('status', { name: 'Loading statistics' })).toBeInTheDocument();
  });

  it('shows every count and the completion rate as a progress bar', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<StatsCards />);

    await screen.findByRole('list', { name: 'Task counts' });
    expect(countOf('Total tasks').getByText('8')).toBeInTheDocument();
    expect(countOf('In progress').getByText('2')).toBeInTheDocument();
    expect(countOf('Done').getByText('2')).toBeInTheDocument();
    expect(countOf('Overdue').getByText('3')).toBeInTheDocument();

    expect(screen.getByRole('progressbar', { name: 'Completion rate' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(screen.getByText('2 of 8 done · 25%')).toBeInTheDocument();
  });

  it('shows zeros and an empty bar when there are no tasks, not an error', async () => {
    server.use(...createTasksHandlers([]));
    renderWithProviders(<StatsCards />);

    await screen.findByRole('list', { name: 'Task counts' });
    expect(countOf('Total tasks').getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 done · 0%')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.statsError(500));
    const { user } = renderWithProviders(<StatsCards />);
    expect(await screen.findByText('Could not load statistics')).toBeInTheDocument();
    expect(
      screen.getByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Task counts' })).toBeInTheDocument();
  });
});
