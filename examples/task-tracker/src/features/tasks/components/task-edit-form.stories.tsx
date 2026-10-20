import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, sampleTask, tasksMocks } from '../mocks';
import { TaskEditForm } from './task-edit-form';

const meta = {
  title: 'Tasks/TaskEditForm',
  component: TaskEditForm,
  args: { task: sampleTask },
  parameters: { msw: { handlers: createTasksHandlers() } },
} satisfies Meta<typeof TaskEditForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` empties the title and saves. */
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
    await userEvent.type(canvas.getByLabelText('Title'), ' v2');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
  },
};
