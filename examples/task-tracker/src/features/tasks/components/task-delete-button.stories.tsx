import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, sampleTask } from '../mocks';
import { TaskDeleteButton } from './task-delete-button';

const meta = {
  title: 'Tasks/TaskDeleteButton',
  component: TaskDeleteButton,
  args: { task: sampleTask },
  parameters: { msw: { handlers: createTasksHandlers() } },
} satisfies Meta<typeof TaskDeleteButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The confirmation dialog, opened by `play`. */
export const Confirming: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
  },
};
