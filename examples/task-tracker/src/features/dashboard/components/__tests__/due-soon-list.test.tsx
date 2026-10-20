import { screen, within } from '@testing-library/react';

import {
  createTasksHandlers,
  dateFromToday,
  taskFixtures,
  tasksMocks,
} from '@/features/tasks/mocks';
import { formatDueDate } from '@/features/tasks/filters';
import type { Task } from '@/features/tasks/schemas';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { DueSoonList } from '../due-soon-list';

const task = (id: number, title: string, dueDate: string | null, status: Task['status']): Task => ({
  id,
  title,
  description: '',
  status,
  priority: 'medium',
  dueDate,
  createdAt: '2026-01-05T09:00:00.000Z',
});

describe('DueSoonList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(tasksMocks.listPending());
    renderWithProviders(<DueSoonList />);
    expect(await screen.findByRole('status', { name: 'Loading due soon' })).toBeInTheDocument();
  });

  it('lists open tasks due in the next 7 days, soonest first, each linking to its detail page', async () => {
    server.use(
      ...createTasksHandlers([
        task(1, 'Later this week', dateFromToday(5), 'todo'),
        task(2, 'Today', dateFromToday(0), 'in_progress'),
        task(3, 'Last day', dateFromToday(7), 'todo'),
        task(4, 'Next week', dateFromToday(8), 'todo'),
        task(5, 'Overdue', dateFromToday(-1), 'todo'),
        task(6, 'Already done', dateFromToday(1), 'done'),
        task(7, 'No date', null, 'todo'),
      ]),
    );
    renderWithProviders(<DueSoonList />);

    const list = await screen.findByRole('list', { name: 'Due soon' });
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Today', 'Later this week', 'Last day']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/tasks/2',
      '/tasks/1',
      '/tasks/3',
    ]);
    expect(within(list).getByText(formatDueDate(dateFromToday(5)))).toBeInTheDocument();
    expect(within(list).getAllByText('To do')).toHaveLength(2);
    expect(within(list).getByText('In progress')).toBeInTheDocument();
  });

  it('shows the due soon tasks of the fixtures', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    renderWithProviders(<DueSoonList />);
    const list = await screen.findByRole('list', { name: 'Due soon' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(list).getByRole('link', { name: 'Write release notes for v2.4' }),
    ).toBeInTheDocument();
  });

  it('shows "Nothing due this week" when no task qualifies, and it is not an error', async () => {
    server.use(...createTasksHandlers([task(1, 'Far away', dateFromToday(30), 'todo')]));
    renderWithProviders(<DueSoonList />);
    expect(await screen.findByText(/Nothing due this week/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the tasks' })).toHaveAttribute('href', '/tasks');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Due soon' })).not.toBeInTheDocument();
  });

  it('shows "Nothing due this week" when there are no tasks at all', async () => {
    server.use(...createTasksHandlers([]));
    renderWithProviders(<DueSoonList />);
    expect(await screen.findByText(/Nothing due this week/)).toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(tasksMocks.listError(500));
    const { user } = renderWithProviders(<DueSoonList />);
    expect(await screen.findByText('Could not load the due soon list')).toBeInTheDocument();

    server.use(...createTasksHandlers(taskFixtures));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Due soon' })).toBeInTheDocument();
  });
});
