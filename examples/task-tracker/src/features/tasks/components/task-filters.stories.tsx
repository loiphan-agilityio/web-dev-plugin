import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskFilters } from './task-filters';

const meta = {
  title: 'Tasks/TaskFilters',
  component: TaskFilters,
} satisfies Meta<typeof TaskFilters>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` fills both filters. */
export const Filled: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(canvas.getByLabelText('Status'), 'In progress');
    await userEvent.type(canvas.getByLabelText('Search by title'), 'report');
  },
};
