import type { Meta, StoryObj } from '@storybook/react-vite';

import { memberFixtures } from '@/mocks/library-fixtures';

import { membersMocks } from '../mocks';
import { MemberDeleteButton } from './member-delete-button';

const meta = {
  title: 'Members/MemberDeleteButton',
  component: MemberDeleteButton,
  args: { member: memberFixtures[0] },
} satisfies Meta<typeof MemberDeleteButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `play` opens the confirmation. */
export const Confirming: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Delete / }));
  },
};

/** `play` confirms a delete the server refuses (the member has active loans). */
export const Conflict: Story = {
  parameters: { msw: { handlers: [membersMocks.deleteConflict()] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Delete / }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete member' }));
  },
};
