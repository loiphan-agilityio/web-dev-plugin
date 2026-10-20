import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTodosHandlers } from '../mocks';
import { TodosPage } from './todos-page';

// TodoList and TodoForm have their own stories per state; this shows the parts together.
const meta = {
  title: 'Todos/TodosPage',
  component: TodosPage,
  parameters: { msw: { handlers: createTodosHandlers() } },
} satisfies Meta<typeof TodosPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
