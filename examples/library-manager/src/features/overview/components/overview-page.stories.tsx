import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLoansHandlers } from '@/features/loans/mocks';

import { OverviewPage } from './overview-page';

// StatCards and OverdueTable have their own stories per state; this shows them together.
const meta = {
  title: 'Overview/OverviewPage',
  component: OverviewPage,
  parameters: { msw: { handlers: createLoansHandlers() } },
} satisfies Meta<typeof OverviewPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
