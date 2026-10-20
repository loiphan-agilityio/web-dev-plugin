import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTodosHandlers, todosMocks } from '../mocks';
import { TodoForm } from './todo-form';

const meta = {
  title: 'Todos/TodoForm',
  component: TodoForm,
  parameters: { msw: { handlers: createTodosHandlers([]) } },
} satisfies Meta<typeof TodoForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` submits the form, so the story opens on it. */
export const ServerFieldError: Story = {
  parameters: { msw: { handlers: [todosMocks.createInvalid({ title: 'Already exists' })] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Duplicate');
    await userEvent.click(canvas.getByRole('button', { name: 'Add todo' }));
  },
};
