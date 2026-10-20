import { screen } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { TaskDetailPage } from '../task-detail-page';

const renderPage = (id: string) =>
  renderWithProviders(<TaskDetailPage />, { path: `/tasks/${id}`, route: '/tasks/:id' });

describe('TaskDetailPage', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.detailPending());
    renderPage('1');
    expect(await screen.findByRole('status', { name: 'Loading task' })).toBeInTheDocument();
  });

  it('shows the task with its edit form and a delete button', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderPage('3');

    expect(
      await screen.findByRole('heading', { name: 'Book the team offsite venue' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Book the team offsite venue');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows "Task not found" with a link back to the list for an unknown id', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderPage('999');

    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to tasks/ })).toHaveAttribute('href', '/tasks');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows "Task not found" without asking the server when the id is not a number', async () => {
    renderPage('abc');
    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
  });

  it('shows an error, different from not found, with a retry that recovers', async () => {
    server.use(tasksMocks.detailError(500));
    const { user } = renderPage('1');
    expect(await screen.findByText('Could not load the task')).toBeInTheDocument();
    expect(screen.queryByText('Task not found')).not.toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText('Title')).toHaveValue(taskFixtures[0]?.title);
  });
});
