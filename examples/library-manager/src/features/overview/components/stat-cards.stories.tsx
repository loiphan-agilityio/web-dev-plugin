import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLoansHandlers, loansMocks } from '@/features/loans/mocks';

import { StatCards } from './stat-cards';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Overview/StatCards',
  component: StatCards,
} satisfies Meta<typeof StatCards>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [loansMocks.statsPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createLoansHandlers() } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [loansMocks.statsError(500)] } },
};
