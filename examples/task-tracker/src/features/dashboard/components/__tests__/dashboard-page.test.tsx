import { screen, waitFor, within } from '@testing-library/react';

import { createTasksHandlers, taskFixtures } from '@/features/tasks/mocks';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

const countOf = (label: string) => within(screen.getByRole('listitem', { name: label }));

// StatsCards and DueSoonList test their own states; this checks them on the route, and that task
// changes made elsewhere in the app reach the dashboard.
describe('DashboardPage', () => {
  it('is the home page, with the cards and the due soon list', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Task counts' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Due soon' })).toBeInTheDocument();
  });

  it('is reachable from the header', async () => {
    server.use(...createTasksHandlers([]));
    const { user, router } = renderRoute('/tasks');

    await user.click(await screen.findByRole('link', { name: 'Dashboard' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('opens a due task from the list', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/');

    await user.click(await screen.findByRole('link', { name: 'Review pull request 142' }));

    expect(await screen.findByRole('form', { name: 'Edit task' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks/3');
  });

  it('refreshes the numbers after a task is created', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/');
    await screen.findByRole('list', { name: 'Task counts' });
    expect(countOf('Total tasks').getByText('8')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Tasks' }));
    await user.type(await screen.findByLabelText('Title'), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await screen.findByText('Task created');
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));

    await waitFor(() => {
      expect(countOf('Total tasks').getByText('9')).toBeInTheDocument();
    });
  });

  it('refreshes the numbers and the due list after a status change', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/');
    await screen.findByRole('list', { name: 'Due soon' });
    expect(countOf('Done').getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Tasks' }));
    await user.selectOptions(
      await screen.findByLabelText('Status of Review pull request 142'),
      'Done',
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Status of Review pull request 142')).toHaveValue('done');
    });
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));

    await waitFor(() => {
      expect(countOf('Done').getByText('3')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Review pull request 142' })).not.toBeInTheDocument();
  });

  it('refreshes the numbers after a task is deleted', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/');
    await screen.findByRole('list', { name: 'Task counts' });

    await user.click(await screen.findByRole('link', { name: 'Review pull request 142' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete task' }));
    await screen.findByText('Task deleted');
    await user.click(screen.getByRole('link', { name: 'Dashboard' }));

    await waitFor(() => {
      expect(countOf('Total tasks').getByText('7')).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Review pull request 142' })).not.toBeInTheDocument();
  });
});
