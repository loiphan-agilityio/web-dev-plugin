import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers } from '@/features/tasks/mocks';

import { DashboardPage } from './dashboard-page';

// StatsCards and DueSoonList have their own stories per state; this shows the parts together.
const meta = {
  title: 'Dashboard/DashboardPage',
  component: DashboardPage,
  parameters: { msw: { handlers: createTasksHandlers() } },
} satisfies Meta<typeof DashboardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
