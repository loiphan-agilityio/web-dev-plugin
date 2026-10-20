import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryDb } from '@/mocks/library-db';
import { bookFixtures } from '@/mocks/library-fixtures';

import { booksMocks, createBooksHandlers } from '../mocks';
import { BookForm } from './book-form';

const meta = {
  title: 'Books/BookForm',
  component: BookForm,
  parameters: { msw: { handlers: createBooksHandlers(createLibraryDb({ books: [] })) } },
} satisfies Meta<typeof BookForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = {
  args: { book: bookFixtures[0] },
};

/** A state reached by interaction: `play` submits the empty form. */
export const ValidationErrors: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add book' }));
  },
};

export const ServerFieldError: Story = {
  parameters: {
    msw: {
      handlers: [
        booksMocks.createInvalid({ isbn: 'A book with this ISBN is already in the catalogue' }),
      ],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Emma');
    await userEvent.type(canvas.getByLabelText('Author'), 'Jane Austen');
    await userEvent.type(canvas.getByLabelText('ISBN'), '9780141439587');
    await userEvent.click(canvas.getByRole('button', { name: 'Add book' }));
  },
};
