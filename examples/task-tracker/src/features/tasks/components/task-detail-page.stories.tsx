import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskDetailPage } from './task-detail-page';

// The story router has no `:id` route, so the page sees no id: the one state it decides itself.
// The states of a loaded task are the TaskDetail stories.
const meta = {
  title: 'Tasks/TaskDetailPage',
  component: TaskDetailPage,
} satisfies Meta<typeof TaskDetailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
