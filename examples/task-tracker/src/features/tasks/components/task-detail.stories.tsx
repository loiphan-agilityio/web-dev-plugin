import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, tasksMocks } from '../mocks';
import { TaskDetail } from './task-detail';

// The form and the delete button have their own stories; this shows each state of the screen.
const meta = {
  title: 'Tasks/TaskDetail',
  component: TaskDetail,
  args: { id: 3 },
} satisfies Meta<typeof TaskDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  parameters: { msw: { handlers: createTasksHandlers() } },
};

export const Loading: Story = {
  parameters: { msw: { handlers: [tasksMocks.detailPending()] } },
};

export const NotFound: Story = {
  parameters: { msw: { handlers: [tasksMocks.detailNotFound()] } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [tasksMocks.detailError(500)] } },
};
