import { screen } from '@testing-library/react';

import { createLibraryDb } from '@/mocks/library-db';
import { memberFixtures } from '@/mocks/library-fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createMembersHandlers, membersMocks } from '../../mocks';
import { MemberDeleteButton } from '../member-delete-button';

// Elena Petrova has no loans, so the in-memory backend lets her go.
const member = memberFixtures[4];
assert(member, 'the fixtures hold a member without loans');

describe('MemberDeleteButton', () => {
  it('asks for confirmation, then deletes and shows a toast', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: memberFixtures })));
    const { user } = renderWithProviders(<MemberDeleteButton member={member} />);

    await user.click(screen.getByRole('button', { name: `Delete ${member.name}` }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(member.name);
    await user.click(screen.getByRole('button', { name: 'Delete member' }));

    expect(await screen.findByText('Member deleted')).toBeInTheDocument();
  });

  it('does nothing when the user cancels', async () => {
    const { user } = renderWithProviders(<MemberDeleteButton member={member} />);

    await user.click(screen.getByRole('button', { name: `Delete ${member.name}` }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Member deleted')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and shows the reason when the member has active loans', async () => {
    server.use(membersMocks.deleteConflict());
    const { user } = renderWithProviders(<MemberDeleteButton member={member} />);

    await user.click(screen.getByRole('button', { name: `Delete ${member.name}` }));
    await user.click(await screen.findByRole('button', { name: 'Delete member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This member has active loans and cannot be deleted.',
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete member' })).toBeEnabled();
  });
});
