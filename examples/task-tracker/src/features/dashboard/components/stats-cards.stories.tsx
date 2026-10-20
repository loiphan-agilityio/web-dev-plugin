import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers, taskFixtures, tasksMocks } from '@/features/tasks/mocks';

import { StatsCards } from './stats-cards';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Dashboard/StatsCards',
  component: StatsCards,
} satisfies Meta<typeof StatsCards>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [tasksMocks.statsPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createTasksHandlers(taskFixtures) } },
};

export const NoTasks: Story = {
  parameters: { msw: { handlers: createTasksHandlers([]) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [tasksMocks.statsError(500)] } },
};
