import { screen, within } from '@testing-library/react';

import { createTasksHandlers, taskFixtures, tasksMocks } from '@/features/tasks/mocks';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { DueSoonList } from '../due-soon-list';

describe('DueSoonList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.listPending());
    renderWithProviders(<DueSoonList />);
    expect(await screen.findByRole('status', { name: 'Loading due tasks' })).toBeInTheDocument();
  });

  it('lists unfinished tasks due within 7 days, soonest first', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<DueSoonList />);

    const list = await screen.findByRole('list', { name: 'Due soon' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText('Review pull request 142')).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText('To do')).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText(/^Due [A-Z][a-z]{2} \d{1,2}$/)).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Update onboarding docs')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('In progress')).toBeInTheDocument();
    // Overdue, done and undated tasks are not "due soon".
    expect(screen.queryByText('Write the Q3 report')).not.toBeInTheDocument();
    expect(screen.queryByText('Renew SSL certificate')).not.toBeInTheDocument();
    expect(screen.queryByText('Book team offsite venue')).not.toBeInTheDocument();
  });

  it('links each title to its task page', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<DueSoonList />);

    const link = await screen.findByRole('link', { name: 'Review pull request 142' });
    expect(link).toHaveAttribute('href', '/tasks/3');
  });

  it('shows an empty state that is not an error when nothing is due', async () => {
    server.use(...createTasksHandlers([]));
    renderWithProviders(<DueSoonList />);

    expect(await screen.findByText(/Nothing due this week/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan the next task' })).toHaveAttribute(
      'href',
      '/tasks',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the empty state when every task is overdue or done', async () => {
    server.use(...createTasksHandlers(taskFixtures.filter((task) => task.id === 1 || task.id === 6)));
    renderWithProviders(<DueSoonList />);
    expect(await screen.findByText(/Nothing due this week/)).toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.listError(500));
    const { user } = renderWithProviders(<DueSoonList />);
    expect(await screen.findByText('Could not load due tasks')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Due soon' })).toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Due soon' })).toBeInTheDocument();
  });
});
