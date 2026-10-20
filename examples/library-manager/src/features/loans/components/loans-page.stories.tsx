import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryHandlers } from '@/mocks/library-handlers';

import { LoansPage } from './loans-page';

// LoanForm, LoanList and LoanReturnButton have their own stories per state; this shows them together.
const meta = {
  title: 'Loans/LoansPage',
  component: LoansPage,
  parameters: { msw: { handlers: createLibraryHandlers() } },
} satisfies Meta<typeof LoansPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
