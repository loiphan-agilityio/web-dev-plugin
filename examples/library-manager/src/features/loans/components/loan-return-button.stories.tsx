import type { Meta, StoryObj } from '@storybook/react-vite';

import { loanFixtures } from '@/mocks/library-fixtures';

import { loansMocks } from '../mocks';
import { LoanReturnButton } from './loan-return-button';

const meta = {
  title: 'Loans/LoanReturnButton',
  component: LoanReturnButton,
  args: { loan: loanFixtures[3] },
} satisfies Meta<typeof LoanReturnButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `play` clicks Return while the server never answers. */
export const Returning: Story = {
  parameters: { msw: { handlers: [loansMocks.returnPending()] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Return / }));
  },
};

/** `play` clicks Return on a loan the server says is already returned. */
export const Conflict: Story = {
  parameters: { msw: { handlers: [loansMocks.returnConflict()] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Return / }));
  },
};
