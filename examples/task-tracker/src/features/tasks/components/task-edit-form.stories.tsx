import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../mocks';
import { TaskEditForm } from './task-edit-form';

const task = taskFixtures[3];
if (!task) {
  throw new Error('missing fixture');
}

const meta = {
  title: 'Tasks/TaskEditForm',
  component: TaskEditForm,
  args: { task },
  parameters: { msw: { handlers: createTasksHandlers(taskFixtures) } },
} satisfies Meta<typeof TaskEditForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ValidationError: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.clear(canvas.getByLabelText('Title'));
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
  },
};

export const ServerFieldError: Story = {
  parameters: {
    msw: {
      handlers: [tasksMocks.updateInvalid({ title: 'A task with this title already exists' })],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), '!');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
  },
};
