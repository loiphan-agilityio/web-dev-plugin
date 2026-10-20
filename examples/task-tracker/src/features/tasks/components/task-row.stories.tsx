import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../mocks';
import { TaskRow } from './task-row';

const [todo, , , , done] = taskFixtures;
if (!todo || !done) {
  throw new Error('missing fixture');
}

const meta = {
  title: 'Tasks/TaskRow',
  component: TaskRow,
  args: { today: '2026-01-05' },
  parameters: { msw: { handlers: createTasksHandlers(taskFixtures) } },
  render: (args) => (
    <ul className="divide-y rounded-lg border">
      <TaskRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof TaskRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overdue: Story = { args: { task: todo, today: '2030-01-01' } };

export const Done: Story = { args: { task: done } };

/** A state reached by interaction: `play` changes the status while the server answers 404. */
export const TaskGone: Story = {
  args: { task: todo },
  parameters: { msw: { handlers: [tasksMocks.updateError(404)] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(canvas.getByLabelText(`Status of ${todo.title}`), 'Done');
  },
};
