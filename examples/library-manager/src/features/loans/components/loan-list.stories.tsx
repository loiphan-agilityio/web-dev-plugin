import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryDb } from '@/mocks/library-db';

import { createLoansHandlers, loansMocks } from '../mocks';
import { LoanList } from './loan-list';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Loans/LoanList',
  component: LoanList,
} satisfies Meta<typeof LoanList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [loansMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createLoansHandlers() } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: createLoansHandlers(createLibraryDb({ loans: [] })) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [loansMocks.listError(500)] } },
};

/** Reached by interaction: `play` chooses the Overdue tab. */
export const OverdueOnly: Story = {
  parameters: { msw: { handlers: createLoansHandlers() } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Overdue' }));
  },
};

/** Reached by interaction: `play` types a search that matches nothing. */
export const NoMatch: Story = {
  parameters: { msw: { handlers: createLoansHandlers() } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search loans' }), 'zzz');
  },
};
