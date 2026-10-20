import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { taskKeys } from '../../queries';
import { DeleteTaskButton } from '../delete-task-button';

const task = taskFixtures[0];
if (!task) {
  throw new Error('missing fixture');
}

const renderButton = () =>
  renderWithProviders(<DeleteTaskButton task={task} />, { path: '/tasks/1', route: '/tasks/:id' });

describe('DeleteTaskButton', () => {
  it('asks for confirmation and deletes nothing when cancelled', async () => {
    let deleted = false;
    server.use(
      http.delete(`${config.apiUrl}/tasks/:id`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router } = renderButton();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Delete this task?');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(deleted).toBe(false);
    expect(router.state.location.pathname).toBe('/tasks/1');
  });

  it('deletes after confirming, shows a toast and goes back to /tasks', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router, queryClient } = renderButton();
    queryClient.setQueryData(taskKeys.lists(), taskFixtures);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks');
    expect(queryClient.getQueryState(taskKeys.lists())?.isInvalidated).toBe(true);
  });

  it('says the task no longer exists, refreshes the list and goes back to /tasks on a 404', async () => {
    server.use(
      http.delete(`${config.apiUrl}/tasks/:id`, () => HttpResponse.json({}, { status: 404 })),
    );
    const { user, router, queryClient } = renderButton();
    queryClient.setQueryData(taskKeys.lists(), taskFixtures);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks');
    expect(queryClient.getQueryState(taskKeys.lists())?.isInvalidated).toBe(true);
    expect(screen.queryByText('Task deleted')).not.toBeInTheDocument();
  });

  it('stays on the page and shows a toast when the delete fails', async () => {
    server.use(tasksMocks.deleteError(500));
    const { user, router } = renderButton();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText(/Something went wrong on our side/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks/1');
  });
});
