import type { Meta, StoryObj } from '@storybook/react-vite';

import { ServerError } from '@/lib/api/errors';

import { ErrorAlert } from './error-alert';

const meta = {
  title: 'Components/ErrorAlert',
  component: ErrorAlert,
  args: { title: 'Could not load todos', error: new ServerError({ status: 500 }) },
} satisfies Meta<typeof ErrorAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRetry: Story = {
  args: { onRetry: () => undefined },
};
