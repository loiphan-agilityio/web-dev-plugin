import { screen, within } from '@testing-library/react';

import { createLibraryDb } from '@/mocks/library-db';
import { memberFixtures } from '@/mocks/library-fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createMembersHandlers, membersMocks } from '../../mocks';
import { MemberList } from '../member-list';

const withMembers = () => {
  server.use(...createMembersHandlers(createLibraryDb({ members: memberFixtures })));
};

describe('MemberList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(membersMocks.listPending());
    renderWithProviders(<MemberList onEdit={vi.fn()} />);
    expect(await screen.findByRole('status', { name: 'Loading members' })).toBeInTheDocument();
  });

  it('shows every member with a status badge and "No phone" when there is none', async () => {
    withMembers();
    renderWithProviders(<MemberList onEdit={vi.fn()} />);

    const table = await screen.findByRole('table', { name: 'Members' });
    expect(within(table).getAllByRole('row')).toHaveLength(memberFixtures.length + 1);

    const elena = within(table).getByRole('row', { name: /Elena Petrova/ });
    expect(within(elena).getByText('Suspended')).toBeInTheDocument();
    const chloe = within(table).getByRole('row', { name: /Chloe Nguyen/ });
    expect(within(chloe).getByText('Active')).toBeInTheDocument();
    expect(within(chloe).getByText('No phone')).toBeInTheDocument();
  });

  it('shows an empty state that is not an error', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: [] })));
    renderWithProviders(<MemberList onEdit={vi.fn()} />);
    expect(await screen.findByText(/No members yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(membersMocks.listError(500));
    const { user } = renderWithProviders(<MemberList onEdit={vi.fn()} />);
    expect(await screen.findByText('Could not load members')).toBeInTheDocument();

    withMembers();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Members' })).toBeInTheDocument();
  });

  it('searches by name or email and keeps the search in the URL', async () => {
    withMembers();
    const { user, router } = renderWithProviders(<MemberList onEdit={vi.fn()} />);
    await screen.findByRole('table', { name: 'Members' });

    await user.type(screen.getByRole('searchbox', { name: 'Search members' }), 'ben.okafor');

    const table = screen.getByRole('table', { name: 'Members' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Ben Okafor')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=ben.okafor');
  });

  it('filters by status, in the URL', async () => {
    withMembers();
    const { user, router } = renderWithProviders(<MemberList onEdit={vi.fn()} />);
    await screen.findByRole('table', { name: 'Members' });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by status' }),
      'suspended',
    );

    const table = screen.getByRole('table', { name: 'Members' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Elena Petrova')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=suspended');
  });

  it('says when nothing matches and clears the filters', async () => {
    withMembers();
    const { user, router } = renderWithProviders(<MemberList onEdit={vi.fn()} />);
    await screen.findByRole('table', { name: 'Members' });

    await user.type(screen.getByRole('searchbox', { name: 'Search members' }), 'zzz');
    expect(screen.getByText('No members match your filters.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('table', { name: 'Members' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('hands the member to onEdit', async () => {
    withMembers();
    const onEdit = vi.fn();
    const { user } = renderWithProviders(<MemberList onEdit={onEdit} />);

    await user.click(await screen.findByRole('button', { name: 'Edit Amelia Hart' }));

    expect(onEdit).toHaveBeenCalledWith(memberFixtures[0]);
  });
});
