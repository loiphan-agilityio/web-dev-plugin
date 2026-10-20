import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatusBadge } from './status-badge';

const meta = {
  title: 'Tasks/StatusBadge',
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Todo: Story = { args: { status: 'todo' } };

export const InProgress: Story = { args: { status: 'in_progress' } };

export const Done: Story = { args: { status: 'done' } };
