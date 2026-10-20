import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskStatusBadge } from './task-status-badge';

const meta = {
  title: 'Tasks/TaskStatusBadge',
  component: TaskStatusBadge,
} satisfies Meta<typeof TaskStatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Todo: Story = { args: { status: 'todo' } };

export const InProgress: Story = { args: { status: 'in_progress' } };

export const Done: Story = { args: { status: 'done' } };
