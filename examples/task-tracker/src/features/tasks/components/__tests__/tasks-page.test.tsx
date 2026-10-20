import { screen, waitFor, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';

// TaskForm, TaskFilters and TaskList test their own cases; this checks them together on the route.
describe('TasksPage', () => {
  it('is reachable from the header', async () => {
    server.use(...createTasksHandlers([]));
    const { user } = renderRoute('/');

    // The home route is lazy, so the layout (and its header) appears once that chunk has loaded.
    await user.click(await screen.findByRole('link', { name: 'Tasks' }));

    expect(await screen.findByRole('heading', { name: 'Tasks', level: 1 })).toBeInTheDocument();
  });

  it('shows a new task in the list after it is created', async () => {
    server.use(...createTasksHandlers([]));
    const { user } = renderRoute('/tasks');
    await screen.findByText(/No tasks yet/);

    await user.type(screen.getByLabelText('Title'), '  Ship it  ');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getByText('Ship it')).toBeInTheDocument();
    expect(within(list).getByLabelText('Status of Ship it')).toHaveValue('todo');
    expect(await screen.findByText('Task created')).toBeInTheDocument();
  });

  it('opens a task from the list, edits it, and the list shows the change', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderRoute('/tasks');

    await user.click(await screen.findByRole('link', { name: 'Review pull request 142' }));
    // The create form's "Title" is on screen until the lazy detail route has loaded.
    await screen.findByRole('form', { name: 'Edit task' });
    const title = screen.getByLabelText('Title');
    expect(title).toHaveValue('Review pull request 142');
    await user.clear(title);
    await user.type(title, 'Review pull request 143');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Task updated')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '← Back to tasks' }));
    expect(await screen.findByRole('link', { name: 'Review pull request 143' })).toBeInTheDocument();
  });

  it('deletes a task from its page and returns to a list without it', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks/3');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks');
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).queryByText('Review pull request 142')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(taskFixtures.length - 1);
  });

  it('goes back to the refreshed list when the task was deleted by someone else', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks');
    await user.click(await screen.findByRole('link', { name: 'Review pull request 142' }));
    await screen.findByRole('form', { name: 'Edit task' });
    server.use(
      tasksMocks.updateNotFound(),
      ...createTasksHandlers(taskFixtures.filter((task) => task.id !== 3)),
    );

    await user.type(screen.getByLabelText('Title'), '!');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/tasks');
    const list = await screen.findByRole('list', { name: 'Tasks' });
    await waitFor(() => {
      expect(within(list).queryByText('Review pull request 142')).not.toBeInTheDocument();
    });
  });

  it('opens with the filters from the URL', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderRoute('/tasks?status=in_progress&q=report');

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Write the Q3 report')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Search by title')).toHaveValue('report');
  });

  it('filters the list when the user picks a status and searches', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderRoute('/tasks');
    await screen.findByRole('list', { name: 'Tasks' });

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(router.state.location.search).toBe('?status=done');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    await user.type(screen.getByLabelText('Search by title'), 'ssl');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Renew SSL certificate')).toBeInTheDocument();
  });
});
