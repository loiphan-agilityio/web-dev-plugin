import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createTasksHandlers, taskFixtures } from '../mocks';
import { taskStatsQueryOptions, useCreateTask, useDeleteTask, useUpdateTask } from '../queries';

/** Shows the stats and one button per write, to prove each write refreshes the stats. */
const Harness = () => {
  const { data } = useQuery(taskStatsQueryOptions());
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  return (
    <div>
      <p>
        Total {data?.total}, done {data?.done}, in progress {data?.inProgress}
      </p>
      <button
        type="button"
        onClick={() => {
          createTask.mutate({ title: 'New', description: '', priority: 'low', dueDate: null });
        }}
      >
        Create
      </button>
      <button
        type="button"
        onClick={() => {
          updateTask.mutate({ id: 3, patch: { status: 'done' } });
        }}
      >
        Complete
      </button>
      <button
        type="button"
        onClick={() => {
          deleteTask.mutate(1);
        }}
      >
        Delete
      </button>
    </div>
  );
};

describe('task mutations and the stats', () => {
  it('refreshes the stats after a task is created', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<Harness />);
    expect(await screen.findByText('Total 8, done 2, in progress 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Total 9, done 2, in progress 2')).toBeInTheDocument();
  });

  it('refreshes the stats after a task is updated', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<Harness />);
    expect(await screen.findByText('Total 8, done 2, in progress 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Complete' }));

    expect(await screen.findByText('Total 8, done 3, in progress 2')).toBeInTheDocument();
  });

  it('refreshes the stats after a task is deleted', async () => {
    server.use(...createTasksHandlers(taskFixtures));
    const { user } = renderWithProviders(<Harness />);
    expect(await screen.findByText('Total 8, done 2, in progress 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Total 7, done 2, in progress 2')).toBeInTheDocument();
  });
});
