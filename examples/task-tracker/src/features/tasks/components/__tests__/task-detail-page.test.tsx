import { screen } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures } from '../../mocks';
import { TaskDetailPage } from '../task-detail-page';

const render = (id: string) =>
  renderWithProviders(<TaskDetailPage />, { path: `/tasks/${id}`, pattern: '/tasks/:id' });

describe('TaskDetailPage', () => {
  it('loads the task named in the URL', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    render('3');
    expect(await screen.findByLabelText('Title')).toHaveValue('Review pull request 142');
  });

  it.each(['abc', '0', '-1', '1.5'])('shows "Task not found" for the id %s, without a request', async (id) => {
    // No handler is registered for this: an unhandled request would fail the test.
    render(id);
    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
  });
});
