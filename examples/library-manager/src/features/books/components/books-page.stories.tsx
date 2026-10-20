import type { Meta, StoryObj } from '@storybook/react-vite';

import { createBooksHandlers } from '../mocks';
import { BooksPage } from './books-page';

// BookList, BookForm and BookDeleteButton have their own stories per state; this shows them together.
const meta = {
  title: 'Books/BooksPage',
  component: BooksPage,
  parameters: { msw: { handlers: createBooksHandlers() } },
} satisfies Meta<typeof BooksPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
