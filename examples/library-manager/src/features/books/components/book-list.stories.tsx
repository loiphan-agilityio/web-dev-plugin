import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryDb } from '@/mocks/library-db';

import { booksMocks, createBooksHandlers } from '../mocks';
import { BookList } from './book-list';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Books/BookList',
  component: BookList,
  args: { onEdit: () => undefined },
} satisfies Meta<typeof BookList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [booksMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createBooksHandlers() } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: createBooksHandlers(createLibraryDb({ books: [] })) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [booksMocks.listError(500)] } },
};

/** Reached by interaction: `play` types a search that matches nothing. */
export const NoMatch: Story = {
  parameters: { msw: { handlers: createBooksHandlers() } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search books' }), 'zzz');
  },
};
