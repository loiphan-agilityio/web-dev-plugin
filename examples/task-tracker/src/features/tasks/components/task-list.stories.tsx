import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../mocks';
import { TaskList } from './task-list';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Tasks/TaskList',
  component: TaskList,
} satisfies Meta<typeof TaskList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [tasksMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createTasksHandlers(taskFixtures) } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: createTasksHandlers([]) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [tasksMocks.listError(500)] } },
};
