import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, sampleTask, taskFixtures, tasksMocks } from '../../mocks';
import { TaskDeleteButton } from '../task-delete-button';

const render = () =>
  renderWithProviders(<TaskDeleteButton task={sampleTask} />, { path: '/tasks/3' });

describe('TaskDeleteButton', () => {
  it('asks for confirmation before deleting', async () => {
    let deleted = false;
    server.use(
      http.delete(`${config.apiUrl}/tasks/:id`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = render();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alertdialog', { name: 'Delete this task?' })).toBeInTheDocument();
    expect(screen.getByText(/Review pull request 142/)).toBeInTheDocument();
    expect(deleted).toBe(false);
  });

  it('does nothing when the user cancels', async () => {
    let deleted = false;
    server.use(
      http.delete(`${config.apiUrl}/tasks/:id`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router } = render();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(deleted).toBe(false);
    expect(router.state.location.pathname).toBe('/tasks/3');
  });

  it('deletes after confirmation, shows a toast and goes back to the list', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = render();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks');
  });

  it('reports a task that is already gone, and goes back to the list', async () => {
    server.use(tasksMocks.deleteNotFound());
    const { user, router } = render();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    expect(screen.queryByText('Task deleted')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks');
  });

  it('shows the error and stays on the page when the server fails', async () => {
    server.use(tasksMocks.deleteError(500));
    const { user, router } = render();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks/3');
  });
});
