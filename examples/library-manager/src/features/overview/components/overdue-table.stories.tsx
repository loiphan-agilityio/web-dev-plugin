import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLoansHandlers, loansMocks } from '@/features/loans/mocks';
import { createLibraryDb } from '@/mocks/library-db';
import { loanFixtures } from '@/mocks/library-fixtures';

import { OverdueTable } from './overdue-table';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Overview/OverdueTable',
  component: OverdueTable,
} satisfies Meta<typeof OverdueTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [loansMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createLoansHandlers() } },
};

export const NothingOverdue: Story = {
  parameters: {
    msw: {
      handlers: createLoansHandlers(
        createLibraryDb({ loans: loanFixtures.filter(({ status }) => status !== 'overdue') }),
      ),
    },
  },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [loansMocks.listError(500)] } },
};
