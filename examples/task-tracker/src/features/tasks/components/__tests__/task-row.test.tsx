import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { taskKeys } from '../../queries';
import { TaskRow } from '../task-row';

const [task] = taskFixtures;
if (!task) {
  throw new Error('missing fixture');
}

const renderRow = () =>
  renderWithProviders(
    <ul>
      <TaskRow task={task} today="2026-01-05" />
    </ul>,
  );

describe('TaskRow', () => {
  it('links the title to the detail page', () => {
    renderRow();
    expect(screen.getByRole('link', { name: task.title })).toHaveAttribute(
      'href',
      `/tasks/${String(task.id)}`,
    );
  });

  it('shows the current status in the select', () => {
    renderRow();
    expect(screen.getByLabelText(`Status of ${task.title}`)).toHaveValue('todo');
  });

  it('sends only the status when it changes', async () => {
    let body: unknown;
    server.use(
      http.patch(`${config.apiUrl}/tasks/:id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...task, status: 'done' });
      }),
      ...createTasksHandlers(taskFixtures),
    );
    const { user } = renderRow();

    await user.selectOptions(screen.getByLabelText(`Status of ${task.title}`), 'Done');

    await screen.findByLabelText(`Status of ${task.title}`);
    expect(body).toEqual({ status: 'done' });
  });

  it('says so and refreshes the list when the task no longer exists', async () => {
    server.use(
      http.patch(`${config.apiUrl}/tasks/:id`, () => HttpResponse.json({}, { status: 404 })),
    );
    const { user, queryClient } = renderRow();
    queryClient.setQueryData(taskKeys.lists(), [task]);

    await user.selectOptions(screen.getByLabelText(`Status of ${task.title}`), 'Done');

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    expect(queryClient.getQueryState(taskKeys.lists())?.isInvalidated).toBe(true);
  });

  it('shows a toast when the update fails', async () => {
    server.use(tasksMocks.updateError(500));
    const { user } = renderRow();

    await user.selectOptions(screen.getByLabelText(`Status of ${task.title}`), 'Done');

    expect(await screen.findByText(/Something went wrong on our side/)).toBeInTheDocument();
  });
});
