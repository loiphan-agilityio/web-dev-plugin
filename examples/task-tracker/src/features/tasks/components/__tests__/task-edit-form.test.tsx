import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import type { Task } from '../../schemas';
import { TaskEditForm } from '../task-edit-form';

const task: Task = {
  id: 1,
  title: 'Write the Q3 report',
  description: 'Summarise delivery metrics.',
  status: 'in_progress',
  priority: 'high',
  dueDate: '2030-05-17',
  createdAt: '2026-01-01T09:00:00.000Z',
};

const save = () => screen.getByRole('button', { name: 'Save changes' });

/** Records the PATCH body and answers with the task merged with it. */
const capturePatch = () => {
  const captured: { body?: unknown } = {};
  server.use(
    http.patch(`${config.apiUrl}/tasks/:id`, async ({ request }) => {
      captured.body = await request.json();
      return HttpResponse.json({ ...task, ...(captured.body as object) });
    }),
    ...createTasksHandlers(taskFixtures),
  );
  return captured;
};

describe('TaskEditForm', () => {
  it('starts with every field of the task', () => {
    renderWithProviders(<TaskEditForm task={task} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Write the Q3 report');
    expect(screen.getByLabelText('Description (optional)')).toHaveValue(
      'Summarise delivery metrics.',
    );
    expect(screen.getByLabelText('Status')).toHaveValue('in_progress');
    expect(screen.getByLabelText('Priority')).toHaveValue('high');
    expect(screen.getByLabelText('Due date (optional)')).toHaveValue('2030-05-17');
  });

  it('shows an empty due date for a task without one', () => {
    renderWithProviders(<TaskEditForm task={{ ...task, dueDate: null }} />);
    expect(screen.getByLabelText('Due date (optional)')).toHaveValue('');
  });

  it('requires a title', async () => {
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.clear(screen.getByLabelText('Title'));
    await user.click(save());

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a title over 120 characters', async () => {
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.click(screen.getByLabelText('Title'));
    await user.paste('a'.repeat(121));
    await user.click(save());

    expect(await screen.findByText('Keep the title under 120 characters')).toBeInTheDocument();
  });

  it('rejects a description over 1000 characters', async () => {
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.click(screen.getByLabelText('Description (optional)'));
    await user.paste('a'.repeat(1001));
    await user.click(save());

    expect(
      await screen.findByText('Keep the description under 1000 characters'),
    ).toBeInTheDocument();
  });

  it('sends only the changed fields and confirms with a toast', async () => {
    const captured = capturePatch();
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'Done');
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), '  Q3 report, final  ');
    await user.click(save());

    expect(await screen.findByText('Task updated')).toBeInTheDocument();
    expect(captured.body).toEqual({ title: 'Q3 report, final', status: 'done' });
  });

  it('sends a null due date when it is cleared', async () => {
    const captured = capturePatch();
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.clear(screen.getByLabelText('Due date (optional)'));
    await user.click(save());

    await waitFor(() => {
      expect(captured.body).toEqual({ dueDate: null });
    });
  });

  it('sends nothing when nothing changed', async () => {
    const captured = capturePatch();
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.click(save());

    expect(await screen.findByText('No changes to save')).toBeInTheDocument();
    expect(captured.body).toBeUndefined();
  });

  it('shows server field errors next to the fields and keeps the input', async () => {
    server.use(
      tasksMocks.updateInvalid({
        title: 'A task with this title already exists',
        dueDate: 'Due date must not be in the past',
      }),
    );
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.type(screen.getByLabelText('Title'), ' v2');
    await user.click(save());

    expect(await screen.findByText('A task with this title already exists')).toBeInTheDocument();
    expect(screen.getByText('Due date must not be in the past')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Write the Q3 report v2');
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Task updated')).not.toBeInTheDocument();
  });

  it('shows a general error when the server fails', async () => {
    server.use(tasksMocks.updateError(500));
    const { user } = renderWithProviders(<TaskEditForm task={task} />);

    await user.type(screen.getByLabelText('Title'), '!');
    await user.click(save());

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
  });

  it('reports a task deleted by someone else and leaves for the list', async () => {
    server.use(tasksMocks.updateNotFound(), ...createTasksHandlers(taskFixtures));
    const { user, router } = renderWithProviders(<TaskEditForm task={task} />, {
      path: '/tasks/1',
    });

    await user.type(screen.getByLabelText('Title'), '!');
    await user.click(save());

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/tasks');
    });
  });
});
