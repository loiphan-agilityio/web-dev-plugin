import { screen } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { TaskDetail } from '../task-detail';

describe('TaskDetail', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.detailPending());
    renderWithProviders(<TaskDetail id={3} />);
    expect(await screen.findByRole('status', { name: 'Loading task' })).toBeInTheDocument();
  });

  it('shows the task in an edit form with a delete button', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskDetail id={3} />);

    expect(await screen.findByRole('form', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Review pull request 142');
    expect(screen.getByLabelText('Status')).toHaveValue('todo');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to tasks' })).toHaveAttribute(
      'href',
      '/tasks',
    );
  });

  it('shows "Task not found" with a way back when the server answers 404', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskDetail id={999} />);

    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to tasks' })).toHaveAttribute('href', '/tasks');
    expect(screen.queryByRole('form', { name: 'Edit task' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.detailError(500));
    const { user } = renderWithProviders(<TaskDetail id={3} />);
    expect(await screen.findByText('Could not load the task')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Task not found' })).not.toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('form', { name: 'Edit task' })).toBeInTheDocument();
  });
});
