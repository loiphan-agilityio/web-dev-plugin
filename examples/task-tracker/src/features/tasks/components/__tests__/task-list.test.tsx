import { act, screen, waitFor, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { formatDueDate } from '../../filters';
import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { TaskList } from '../task-list';

const row = async (title: string) => {
  const list = await screen.findByRole('list', { name: 'Tasks' });
  const item = within(list)
    .getAllByRole('listitem')
    .find((element) => within(element).queryByText(title) !== null);
  if (!item) {
    throw new Error(`No row for ${title}`);
  }
  return within(item);
};

describe('TaskList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.listPending());
    renderWithProviders(<TaskList />);
    expect(await screen.findByRole('status', { name: 'Loading tasks' })).toBeInTheDocument();
  });

  it('shows every task', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(taskFixtures.length);
  });

  it('shows title, status, priority and due date on a row', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);
    const release = await row('Write release notes for v2.4');
    expect(release.getByText('In progress')).toBeInTheDocument();
    expect(release.getByText('High')).toBeInTheDocument();
    expect(release.getByText(formatDueDate(taskFixtures[3]?.dueDate ?? ''))).toBeInTheDocument();
  });

  it('says "No due date" for a task without one', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);
    const onboarding = await row('Update onboarding checklist');
    expect(onboarding.getByText('No due date')).toBeInTheDocument();
  });

  it('marks only tasks past due and not done as overdue', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);
    expect((await row('Send the Q3 report to finance')).getByText('Overdue')).toBeInTheDocument();
    expect((await row('Fix the flaky checkout test')).getByText('Overdue')).toBeInTheDocument();
    // Past due but done, due in the future, and no due date.
    expect((await row('Renew the SSL certificate')).queryByText('Overdue')).not.toBeInTheDocument();
    expect(
      (await row('Book the team offsite venue')).queryByText('Overdue'),
    ).not.toBeInTheDocument();
    expect(
      (await row('Plan the customer interview round')).queryByText('Overdue'),
    ).not.toBeInTheDocument();
  });

  it('filters by the status in the URL', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await act(() => router.navigate('/?status=done'));

    const list = screen.getByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Renew the SSL certificate')).toBeInTheDocument();
  });

  it('filters by the title search in the URL', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await act(() => router.navigate('/?q=checkout'));

    const list = screen.getByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('changes the status of a row in place', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await user.selectOptions(
      screen.getByLabelText('Status of Book the team offsite venue'),
      'Done',
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Status of Book the team offsite venue')).toHaveValue('done');
    });
  });

  it('drops a row from a filtered list when its status no longer matches', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });
    await act(() => router.navigate('/?status=done'));
    expect(screen.getByText('Update onboarding checklist')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Status of Update onboarding checklist'),
      'To do',
    );

    await waitFor(() => {
      expect(screen.queryByText('Update onboarding checklist')).not.toBeInTheDocument();
    });
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createTasksHandlers([]));
    renderWithProviders(<TaskList />);
    expect(await screen.findByText(/No tasks yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a different empty state when the filters match nothing, and clears them', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await act(() => router.navigate('/?status=done&q=report'));

    expect(screen.getByText('No tasks match these filters.')).toBeInTheDocument();
    expect(screen.queryByText(/No tasks yet/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('list', { name: 'Tasks' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.listError(500));
    const { user } = renderWithProviders(<TaskList />);
    expect(await screen.findByText('Could not load tasks')).toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Tasks' })).toBeInTheDocument();
  });
});
