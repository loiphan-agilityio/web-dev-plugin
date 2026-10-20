import { screen, within } from '@testing-library/react';

import { createLibraryDb } from '@/mocks/library-db';
import { memberFixtures } from '@/mocks/library-fixtures';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createMembersHandlers } from '../../mocks';

// MemberList, MemberForm and MemberDeleteButton test their own states; this checks they work together.
describe('MembersPage', () => {
  it('shows a new member in the list after it is created', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: [] })));
    const { user } = renderRoute('/members');
    await screen.findByText(/No members yet/);

    await user.type(screen.getByLabelText('Name'), '  Grace Lee ');
    await user.type(screen.getByLabelText('Email'), 'grace.lee@example.com');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    const table = await screen.findByRole('table', { name: 'Members' });
    expect(within(table).getByText('Grace Lee')).toBeInTheDocument();
    expect(within(table).getByText('No phone')).toBeInTheDocument();
  });

  it('edits a member in the form above the list and shows the change', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: memberFixtures })));
    const { user } = renderRoute('/members');

    await user.click(await screen.findByRole('button', { name: 'Edit Farid Haddad' }));
    expect(screen.getByRole('heading', { name: 'Edit member' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Farid Haddad');

    await user.selectOptions(screen.getByLabelText('Status'), 'suspended');
    await user.click(screen.getByRole('button', { name: 'Save member' }));

    const row = await screen.findByRole('row', { name: /Farid Haddad/ });
    expect(await within(row).findByText('Suspended')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add a member' })).toBeInTheDocument();
  });

  it('removes a deleted member from the list', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: memberFixtures })));
    const { user } = renderRoute('/members');

    await user.click(await screen.findByRole('button', { name: 'Delete Elena Petrova' }));
    await user.click(await screen.findByRole('button', { name: 'Delete member' }));

    expect(await screen.findByText('Member deleted')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Elena Petrova/ })).not.toBeInTheDocument();
  });

  it('refuses to delete a member with active loans and says why', async () => {
    server.use(...createMembersHandlers());
    const { user } = renderRoute('/members');

    await user.click(await screen.findByRole('button', { name: 'Delete Ben Okafor' }));
    await user.click(await screen.findByRole('button', { name: 'Delete member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('active loans');
    // While the dialog is open the rest of the page is hidden from assistive technology.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('row', { name: /Ben Okafor/ })).toBeInTheDocument();
  });
});
