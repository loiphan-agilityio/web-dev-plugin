import type { Meta, StoryObj } from '@storybook/react-vite';

import { createTasksHandlers } from '../mocks';
import { TasksPage } from './tasks-page';

// TaskForm, TaskFilters and TaskList have their own stories per state; this shows the parts together.
const meta = {
  title: 'Tasks/TasksPage',
  component: TasksPage,
  parameters: { msw: { handlers: createTasksHandlers() } },
} satisfies Meta<typeof TasksPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
