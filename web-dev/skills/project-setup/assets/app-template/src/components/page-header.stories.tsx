import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

import { PageHeader } from './page-header';

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  args: { title: 'Todos' },
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescriptionAndActions: Story = {
  args: {
    description: 'Everything left to do.',
    actions: <Button type="button">New todo</Button>,
  },
};
