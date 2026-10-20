import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createTasksHandlers, taskFixtures } from '../../mocks';

// TaskForm, TaskFilters and TaskList test their own cases; this checks the parts together.
describe('TasksPage', () => {
  it('is linked from the header', async () => {
    server.use(...createTasksHandlers([]));
    const { user } = renderRoute('/');

    // The home page is a lazy route: the header is not there until it has loaded.
    await user.click(await screen.findByRole('link', { name: 'Tasks' }));

    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('shows a new task in the list after it is created', async () => {
    server.use(...createTasksHandlers([]));
    const { user } = renderRoute('/tasks');
    await screen.findByText(/No tasks yet/);

    await user.type(screen.getByLabelText('Title'), '  Ship it  ');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getByText('Ship it')).toBeInTheDocument();
    expect(within(list).getByText('To do')).toBeInTheDocument();
    expect(within(list).getByText('No due date')).toBeInTheDocument();
    expect(await screen.findByText('Task created')).toBeInTheDocument();
  });

  it('opens a task from the list and goes back to the list', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks');

    await user.click(await screen.findByRole('link', { name: 'Book the team offsite venue' }));

    expect(
      await screen.findByRole('heading', { name: 'Book the team offsite venue' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/tasks/3');

    await user.click(screen.getByRole('link', { name: /Back to tasks/ }));
    expect(await screen.findByRole('list', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('shows an edit made on the detail page in the list', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/tasks');
    await user.click(await screen.findByRole('link', { name: 'Book the team offsite venue' }));
    await screen.findByRole('heading', { name: 'Book the team offsite venue' });

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Book the offsite');
    await user.selectOptions(screen.getByLabelText('Status'), 'Done');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Task updated')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Back to tasks/ }));

    expect(await screen.findByLabelText('Status of Book the offsite')).toHaveValue('done');
  });

  it('removes a deleted task from the list and confirms with a toast', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks/3');
    await screen.findByRole('heading', { name: 'Book the team offsite venue' });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(router.state.location.pathname).toBe('/tasks');
    expect(within(list).queryByText('Book the team offsite venue')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(taskFixtures.length - 1);
    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
  });

  it('refreshes the list and goes back when the task was deleted elsewhere', async () => {
    const handlers = createTasksHandlers(taskFixtures);
    server.use(...handlers);
    const { user, router } = renderRoute('/tasks/3');
    await screen.findByRole('heading', { name: 'Book the team offsite venue' });
    // Someone else deletes it: the list endpoint no longer has it, and the DELETE says 404.
    server.use(
      http.delete(`${config.apiUrl}/tasks/:id`, () => HttpResponse.json({}, { status: 404 })),
      http.get(`${config.apiUrl}/tasks`, () =>
        HttpResponse.json(taskFixtures.filter(({ id }) => id !== 3)),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(router.state.location.pathname).toBe('/tasks');
    await waitFor(() => {
      expect(within(list).queryByText('Book the team offsite venue')).not.toBeInTheDocument();
    });
  });

  it('shows "Task not found" for an unknown id', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderRoute('/tasks/999');
    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
  });

  it('applies the filters in the URL on load', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderRoute('/tasks?status=in_progress&q=release');

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Write release notes for v2.4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Search')).toHaveValue('release');
  });

  it('filters the list and updates the URL when the filters change', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks');
    await screen.findByRole('list', { name: 'Tasks' });

    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.type(screen.getByLabelText('Search'), 'ssl');

    expect(router.state.location.search).toBe('?status=done&q=ssl');
    const list = screen.getByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps a created task hidden by the filters, and shows it once they are cleared', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/tasks?status=done');
    await screen.findByRole('list', { name: 'Tasks' });

    await user.type(screen.getByLabelText('Title'), 'Brand new task');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await screen.findByText('Task created');
    expect(screen.queryByText('Brand new task')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(await screen.findByText('Brand new task')).toBeInTheDocument();
  });
});
