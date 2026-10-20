import type { Meta, StoryObj } from '@storybook/react-vite';
import { Navigate, Route, Routes } from 'react-router';

import { createTasksHandlers, taskFixtures, tasksMocks } from '../mocks';
import { TaskDetailPage } from './task-detail-page';

// The preview's router starts at '/': redirect to a task so `useParams` has an id.
const meta = {
  title: 'Tasks/TaskDetailPage',
  component: TaskDetailPage,
  render: () => (
    <Routes>
      <Route path="/tasks/:id" element={<TaskDetailPage />} />
      <Route path="*" element={<Navigate to="/tasks/3" replace />} />
    </Routes>
  ),
} satisfies Meta<typeof TaskDetailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [tasksMocks.detailPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createTasksHandlers(taskFixtures) } },
};

export const NotFound: Story = {
  parameters: { msw: { handlers: [tasksMocks.detailError(404)] } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [tasksMocks.detailError(500)] } },
};
