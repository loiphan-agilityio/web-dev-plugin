import type { Meta, StoryObj } from '@storybook/react-vite';

import { createMembersHandlers } from '../mocks';
import { MembersPage } from './members-page';

// MemberList, MemberForm and MemberDeleteButton have their own stories per state; this shows them together.
const meta = {
  title: 'Members/MembersPage',
  component: MembersPage,
  parameters: { msw: { handlers: createMembersHandlers() } },
} satisfies Meta<typeof MembersPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
