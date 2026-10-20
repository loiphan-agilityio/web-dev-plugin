import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryDb } from '@/mocks/library-db';
import { memberFixtures } from '@/mocks/library-fixtures';

import { createMembersHandlers, membersMocks } from '../mocks';
import { MemberForm } from './member-form';

const meta = {
  title: 'Members/MemberForm',
  component: MemberForm,
  parameters: { msw: { handlers: createMembersHandlers(createLibraryDb({ members: [] })) } },
} satisfies Meta<typeof MemberForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = {
  args: { member: memberFixtures[0] },
};

/** A state reached by interaction: `play` submits the empty form. */
export const ValidationErrors: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add member' }));
  },
};

export const ServerFieldError: Story = {
  parameters: {
    msw: {
      handlers: [membersMocks.createInvalid({ email: 'A member with this email already exists' })],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Grace Lee');
    await userEvent.type(canvas.getByLabelText('Email'), 'grace.lee@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Add member' }));
  },
};
