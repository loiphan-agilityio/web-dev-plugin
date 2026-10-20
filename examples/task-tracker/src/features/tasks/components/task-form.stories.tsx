import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, tasksMocks } from '../mocks';
import { TaskForm } from './task-form';

const meta = {
  title: 'Tasks/TaskForm',
  component: TaskForm,
  parameters: { msw: { handlers: createTasksHandlers([]) } },
} satisfies Meta<typeof TaskForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` submits the empty form, so the story opens on it. */
export const ValidationError: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add task' }));
  },
};

export const ServerFieldError: Story = {
  parameters: {
    msw: {
      handlers: [tasksMocks.createInvalid({ title: 'A task with this title already exists' })],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Duplicate');
    await userEvent.click(canvas.getByRole('button', { name: 'Add task' }));
  },
};
