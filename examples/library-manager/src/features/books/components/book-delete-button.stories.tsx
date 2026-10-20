import type { Meta, StoryObj } from '@storybook/react-vite';

import { bookFixtures } from '@/mocks/library-fixtures';

import { booksMocks } from '../mocks';
import { BookDeleteButton } from './book-delete-button';

const meta = {
  title: 'Books/BookDeleteButton',
  component: BookDeleteButton,
  args: { book: bookFixtures[0] },
} satisfies Meta<typeof BookDeleteButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `play` opens the confirmation. */
export const Confirming: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Delete / }));
  },
};

/** `play` confirms a delete the server refuses (the book has active loans). */
export const Conflict: Story = {
  parameters: { msw: { handlers: [booksMocks.deleteConflict()] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Delete / }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete book' }));
  },
};
