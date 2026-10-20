import type { Meta, StoryObj } from '@storybook/react-vite';

import { createLibraryDb } from '@/mocks/library-db';

import { createMembersHandlers, membersMocks } from '../mocks';
import { MemberList } from './member-list';

// One story per state, driven by the same MSW handlers as the tests.
const meta = {
  title: 'Members/MemberList',
  component: MemberList,
  args: { onEdit: () => undefined },
} satisfies Meta<typeof MemberList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  parameters: { msw: { handlers: [membersMocks.listPending()] } },
};

export const Success: Story = {
  parameters: { msw: { handlers: createMembersHandlers() } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: createMembersHandlers(createLibraryDb({ members: [] })) } },
};

export const ErrorState: Story = {
  parameters: { msw: { handlers: [membersMocks.listError(500)] } },
};

/** Reached by interaction: `play` types a search that matches nothing. */
export const NoMatch: Story = {
  parameters: { msw: { handlers: createMembersHandlers() } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search members' }), 'zzz');
  },
};
