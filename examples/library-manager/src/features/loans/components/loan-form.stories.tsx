import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryHandlers } from '@/mocks/library-handlers';

import { loansMocks } from '../mocks';
import { LoanForm } from './loan-form';

const meta = {
  title: 'Loans/LoanForm',
  component: LoanForm,
  parameters: { msw: { handlers: createLibraryHandlers() } },
} satisfies Meta<typeof LoanForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A state reached by interaction: `play` submits the empty form. */
export const ValidationErrors: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Lend book' }));
  },
};

export const ServerFieldError: Story = {
  parameters: {
    msw: {
      handlers: [
        loansMocks.createInvalid({ bookId: 'No copies of this book are available' }),
        ...createLibraryHandlers(),
      ],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('option', { name: 'Dune (1 available)' });
    await userEvent.selectOptions(canvas.getByLabelText('Book'), 'Dune (1 available)');
    await userEvent.selectOptions(canvas.getByLabelText('Member'), 'Amelia Hart');
    await userEvent.click(canvas.getByRole('button', { name: 'Lend book' }));
  },
};
