import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { taskKeys } from '../../queries';
import { TaskEditForm } from '../task-edit-form';

const task = taskFixtures[3];
if (!task) {
  throw new Error('missing fixture');
}

const renderForm = () => renderWithProviders(<TaskEditForm task={task} />);
const save = () => screen.getByRole('button', { name: 'Save changes' });

describe('TaskEditForm', () => {
  it('shows every field of the task, status included', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toHaveValue(task.title);
    expect(screen.getByLabelText('Description')).toHaveValue(task.description);
    expect(screen.getByLabelText('Status')).toHaveValue('in_progress');
    expect(screen.getByLabelText('Priority')).toHaveValue('high');
    expect(screen.getByLabelText('Due date')).toHaveValue(task.dueDate);
  });

  it('keeps Save disabled until something changes', async () => {
    const { user } = renderForm();
    expect(save()).toBeDisabled();

    await user.type(screen.getByLabelText('Title'), '!');

    expect(save()).toBeEnabled();
  });

  it('requires a title', async () => {
    const { user } = renderForm();

    await user.clear(screen.getByLabelText('Title'));
    await user.click(save());

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a title longer than 120 characters', async () => {
    const { user } = renderForm();

    await user.clear(screen.getByLabelText('Title'));
    await user.paste('a'.repeat(121));
    await user.click(save());

    expect(await screen.findByText('Keep the title under 120 characters')).toBeInTheDocument();
  });

  it('rejects a description longer than 1000 characters', async () => {
    const { user } = renderForm();

    await user.clear(screen.getByLabelText('Description'));
    await user.paste('a'.repeat(1001));
    await user.click(save());

    expect(
      await screen.findByText('Keep the description under 1000 characters'),
    ).toBeInTheDocument();
  });

  it('sends only the changed fields and confirms with a toast', async () => {
    let body: unknown;
    server.use(
      http.patch(`${config.apiUrl}/tasks/:id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...task, status: 'done', title: 'Renamed' });
      }),
      ...createTasksHandlers(taskFixtures),
    );
    const { user } = renderForm();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), '  Renamed  ');
    await user.selectOptions(screen.getByLabelText('Status'), 'Done');
    await user.click(save());

    expect(await screen.findByText('Task updated')).toBeInTheDocument();
    expect(body).toEqual({ title: 'Renamed', status: 'done' });
  });

  it('sends a null due date when the date is cleared', async () => {
    let body: unknown;
    server.use(
      http.patch(`${config.apiUrl}/tasks/:id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...task, dueDate: null });
      }),
    );
    const { user } = renderForm();

    await user.clear(screen.getByLabelText('Due date'));
    await user.click(save());

    await screen.findByText('Task updated');
    expect(body).toEqual({ dueDate: null });
  });

  it('puts the saved task in the cache and disables Save again', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, queryClient } = renderForm();

    await user.selectOptions(screen.getByLabelText('Priority'), 'Low');
    await user.click(save());

    await screen.findByText('Task updated');
    expect(queryClient.getQueryData(taskKeys.detail(task.id))).toMatchObject({ priority: 'low' });
    expect(save()).toBeDisabled();
  });

  it('shows server field errors next to the fields', async () => {
    server.use(tasksMocks.updateInvalid({ title: 'A task with this title already exists' }));
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Title'), '!');
    await user.click(save());

    expect(await screen.findByText('A task with this title already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a server failure without field details above the button', async () => {
    server.use(tasksMocks.updateError(500));
    const { user } = renderForm();

    await user.type(screen.getByLabelText('Title'), '!');
    await user.click(save());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('says the task no longer exists, refreshes the list and goes back to /tasks on a 404', async () => {
    server.use(tasksMocks.updateError(404));
    const { user, router, queryClient } = renderForm();
    queryClient.setQueryData(taskKeys.lists(), [task]);

    await user.type(screen.getByLabelText('Title'), '!');
    await user.click(save());

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    expect(queryClient.getQueryState(taskKeys.lists())?.isInvalidated).toBe(true);
    expect(router.state.location.pathname).toBe('/tasks');
  });
});
