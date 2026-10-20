import { screen } from '@testing-library/react';

import { authMocks, sessionFixture } from '@/features/auth/mocks';
import { getSession, setSession } from '@/lib/session';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

describe('RootLayout', () => {
  beforeEach(() => {
    setSession(sessionFixture);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks the current page in the sidebar', async () => {
    renderRoute('/');
    expect(await screen.findByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('expands Links into its two sub-items', async () => {
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Links' }));
    expect(screen.getByRole('link', { name: 'All links' })).toHaveAttribute('href', '/links');
    expect(screen.getByRole('link', { name: 'Create link' })).toHaveAttribute('href', '/links/new');
  });

  it('keeps the sidebar on an unknown URL', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('lists what Create new can make', async () => {
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Create new' }));
    expect(screen.getByRole('menuitem', { name: 'Link' })).toHaveAttribute('href', '/links/new');
    expect(screen.getByRole('menuitem', { name: 'QR Code' })).toHaveAttribute(
      'href',
      '/qr-codes/new',
    );
    expect(screen.getByRole('menuitem', { name: 'Page' })).toHaveAttribute('href', '/pages/new');
  });

  it('shows the signed-in user in the account menu', async () => {
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    expect(screen.getByText(sessionFixture.email)).toBeInTheDocument();
  });

  it('signs out: back to sign in, with the session gone', async () => {
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(getSession()).toBeNull();
  });

  it('signs out locally even when the API call fails', async () => {
    server.use(authMocks.fail('logout', 500));
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(getSession()).toBeNull();
  });

  it('dismisses the usage card', async () => {
    const { user } = renderRoute('/');
    expect(await screen.findByText('2/10 links available')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('2/10 links available')).not.toBeInTheDocument();
  });

  // Only Date is faked, so user-event and Radix still run on real timers.
  it.each([
    [new Date(2024, 6, 22, 9, 0), 'Good morning, alice'],
    [new Date(2024, 6, 22, 14, 0), 'Good afternoon, alice'],
    [new Date(2024, 6, 22, 20, 0), 'Good evening, alice'],
  ])('greets by the time of day (%s)', async (now, greeting) => {
    vi.useFakeTimers({ toFake: ['Date'], now });
    renderRoute('/');
    expect(await screen.findByText(greeting)).toBeInTheDocument();
    expect(screen.getByText('Mon, July 22')).toBeInTheDocument();
  });
});
