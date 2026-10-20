import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../../mocks';
import { TaskList } from '../task-list';

const rowOf = (title: string) => {
  const row = screen.getByText(title).closest('li');
  if (!row) throw new Error(`No row for ${title}`);
  return within(row);
};

describe('TaskList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.listPending());
    renderWithProviders(<TaskList />);
    expect(await screen.findByRole('status', { name: 'Loading tasks' })).toBeInTheDocument();
  });

  it('shows each task with its status, priority and due date', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(taskFixtures.length);

    const report = rowOf('Write the Q3 report');
    expect(report.getByLabelText('Status of Write the Q3 report')).toHaveValue('in_progress');
    expect(report.getByText('High')).toBeInTheDocument();
    expect(report.getByText(/^Overdue · [A-Z][a-z]{2} \d{1,2}$/)).toBeInTheDocument();
    expect(report.getByText(/Summarise delivery metrics/)).toBeInTheDocument();

    expect(rowOf('Book team offsite venue').getByText('No due date')).toBeInTheDocument();
  });

  it('marks only unfinished tasks past their due date as overdue', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    expect(rowOf('Fix login redirect bug').getByText(/^Overdue · /)).toBeInTheDocument();
    // Done, even though its due date has passed.
    expect(rowOf('Renew SSL certificate').queryByText(/Overdue/)).not.toBeInTheDocument();
    // Not due yet.
    expect(rowOf('Review pull request 142').queryByText(/Overdue/)).not.toBeInTheDocument();
    // No due date.
    expect(rowOf('Book team offsite venue').queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createTasksHandlers([]));
    renderWithProviders(<TaskList />);
    expect(await screen.findByText(/No tasks yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.listError(500));
    const { user } = renderWithProviders(<TaskList />);
    expect(await screen.findByText('Could not load tasks')).toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('filters by the status in the URL', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await act(() => router.navigate('/?status=done'));

    const list = screen.getByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Renew SSL certificate')).toBeInTheDocument();
    expect(screen.queryByText('Write the Q3 report')).not.toBeInTheDocument();
  });

  it('searches titles case-insensitively and combines with the status', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await act(() => router.navigate('/?q=REPORT'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Write the Q3 report')).toBeInTheDocument();

    await act(() => router.navigate('/?q=report&status=done'));
    expect(screen.getByText('No tasks match your filters.')).toBeInTheDocument();
  });

  it('shows a different empty state when the filters match nothing, with a way out', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { router, user } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });
    await act(() => router.navigate('/?q=nothing-like-this'));

    expect(screen.getByText('No tasks match your filters.')).toBeInTheDocument();
    expect(screen.queryByText(/No tasks yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('list', { name: 'Tasks' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('links each title to its task page', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<TaskList />);

    const link = await screen.findByRole('link', { name: 'Write the Q3 report' });
    expect(link).toHaveAttribute('href', '/tasks/1');
  });

  it('changes the status of a row in place', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await user.selectOptions(screen.getByLabelText('Status of Review pull request 142'), 'Done');

    await waitFor(() => {
      expect(screen.getByLabelText('Status of Review pull request 142')).toHaveValue('done');
    });
    expect(screen.getByLabelText('Status of Fix login redirect bug')).toHaveValue('todo');
  });

  it('moves a task out of a filtered list when its status changes', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user, router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });
    await act(() => router.navigate('/?status=todo'));
    expect(screen.getByText('Review pull request 142')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status of Review pull request 142'), 'Done');

    await waitFor(() => {
      expect(screen.queryByText('Review pull request 142')).not.toBeInTheDocument();
    });
  });

  it('sends only the status', async () => {
    let body: unknown;
    server.use(
      http.patch(`${config.apiUrl}/tasks/:id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...taskFixtures[2], status: 'in_progress' });
      }),
      ...createTasksHandlers(taskFixtures),
    );
    const { user } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await user.selectOptions(
      screen.getByLabelText('Status of Review pull request 142'),
      'In progress',
    );

    await waitFor(() => {
      expect(body).toEqual({ status: 'in_progress' });
    });
  });

  it('tells the user when the status change fails and keeps the old status', async () => {
    server.use(tasksMocks.updateError(500), ...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await user.selectOptions(screen.getByLabelText('Status of Review pull request 142'), 'Done');

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Status of Review pull request 142')).toHaveValue('todo');
  });

  it('reports a task deleted elsewhere and refreshes the list', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<TaskList />);
    expect(await screen.findByText('Review pull request 142')).toBeInTheDocument();
    // Now someone else deletes it: the PATCH answers 404 and the next list no longer has it.
    server.use(
      tasksMocks.updateNotFound(),
      ...createTasksHandlers(taskFixtures.filter((task) => task.id !== 3)),
    );

    await user.selectOptions(screen.getByLabelText('Status of Review pull request 142'), 'Done');

    expect(await screen.findByText('This task no longer exists')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Review pull request 142')).not.toBeInTheDocument();
    });
  });

  it('treats an unknown status in the URL as all', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { router } = renderWithProviders(<TaskList />);
    await screen.findByRole('list', { name: 'Tasks' });

    await act(() => router.navigate('/?status=bogus'));

    expect(screen.getAllByRole('listitem')).toHaveLength(taskFixtures.length);
  });
});
