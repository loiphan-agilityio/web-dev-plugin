import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTodosHandlers, todoFixtures, todosMocks } from '../mocks';
import { TodoList } from './todo-list';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Todos/TodoList',
  component: TodoList,
} satisfies Meta<typeof TodoList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [todosMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createTodosHandlers(todoFixtures) } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: createTodosHandlers([]) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [todosMocks.listError(500)] } },
};
