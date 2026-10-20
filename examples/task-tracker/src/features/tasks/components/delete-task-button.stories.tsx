import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, taskFixtures } from '../mocks';
import { DeleteTaskButton } from './delete-task-button';

const task = taskFixtures[0];
if (!task) {
  throw new Error('missing fixture');
}

const meta = {
  title: 'Tasks/DeleteTaskButton',
  component: DeleteTaskButton,
  args: { task },
  parameters: { msw: { handlers: createTasksHandlers(taskFixtures) } },
} satisfies Meta<typeof DeleteTaskButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` opens the confirmation. */
export const Confirming: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
  },
};
