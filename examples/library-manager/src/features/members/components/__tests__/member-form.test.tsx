import { screen, waitFor } from '@testing-library/react';

import { createLibraryDb } from '@/mocks/library-db';
import { memberFixtures } from '@/mocks/library-fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createMembersHandlers, membersMocks } from '../../mocks';
import { MemberForm } from '../member-form';

const [amelia] = memberFixtures;
assert(amelia, 'the fixtures start with a member');

const fillNewMember = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.type(screen.getByLabelText('Name'), 'Grace Lee');
  await user.type(screen.getByLabelText('Email'), 'grace.lee@example.com');
};

describe('MemberForm', () => {
  it('validates on the client', async () => {
    const { user } = renderWithProviders(<MemberForm />);

    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects an email without a domain', async () => {
    const { user } = renderWithProviders(<MemberForm />);
    await user.type(screen.getByLabelText('Name'), 'Grace Lee');
    await user.type(screen.getByLabelText('Email'), 'grace@lee');

    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('clears the form and shows a toast after a successful create', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: [] })));
    const { user } = renderWithProviders(<MemberForm />);
    await fillNewMember(user);
    await user.selectOptions(screen.getByLabelText('Status'), 'suspended');

    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('Member created')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('');
    });
    expect(screen.getByLabelText('Status')).toHaveValue('active');
  });

  it('shows a server field error under the input', async () => {
    server.use(membersMocks.createInvalid({ email: 'A member with this email already exists' }));
    const { user } = renderWithProviders(<MemberForm />);
    await fillNewMember(user);

    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('A member with this email already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a server failure above the button and lets the user retry', async () => {
    server.use(membersMocks.createError(500));
    const { user } = renderWithProviders(<MemberForm />);
    await fillNewMember(user);

    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side');
    expect(screen.getByRole('button', { name: 'Add member' })).toBeEnabled();
  });

  it('edits a member: prefilled, saved, and the page is told it is done', async () => {
    server.use(...createMembersHandlers(createLibraryDb({ members: memberFixtures })));
    const onDone = vi.fn();
    const { user } = renderWithProviders(<MemberForm member={amelia} onDone={onDone} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Amelia Hart');
    expect(screen.getByLabelText('Status')).toHaveValue('active');

    await user.selectOptions(screen.getByLabelText('Status'), 'suspended');
    await user.click(screen.getByRole('button', { name: 'Save member' }));

    expect(await screen.findByText('Member updated')).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('shows a server error on an edit', async () => {
    server.use(membersMocks.updateInvalid({ email: 'A member with this email already exists' }));
    const { user } = renderWithProviders(<MemberForm member={amelia} />);

    await user.click(screen.getByRole('button', { name: 'Save member' }));

    expect(await screen.findByText('A member with this email already exists')).toBeInTheDocument();
  });

  it('cancels an edit', async () => {
    const onDone = vi.fn();
    const { user } = renderWithProviders(<MemberForm member={amelia} onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDone).toHaveBeenCalledOnce();
  });
});
