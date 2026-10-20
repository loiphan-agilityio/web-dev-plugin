import { screen } from '@testing-library/react';

import { sessionFixture } from '@/features/auth/mocks';
import { setSession } from '@/lib/session';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createLinksHandlers } from '../../mocks';

// CreateLinkForm and CreatedLink test their own cases; this checks them together on the route.
describe('CreateLinkPage', () => {
  beforeEach(() => {
    setSession(sessionFixture);
  });

  it('is the current page in the sidebar', async () => {
    renderRoute('/links/new');
    expect(await screen.findByRole('heading', { name: 'Create link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create link' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the short URL after creating, and Create another brings back an empty form', async () => {
    server.use(...createLinksHandlers());
    const { user } = renderRoute('/links/new');

    await user.type(await screen.findByLabelText('Destination URL'), 'https://example.com/a');
    await user.type(screen.getByLabelText('Custom alias (optional)'), 'demo');
    await user.click(screen.getByRole('button', { name: 'Create link' }));

    expect(await screen.findByRole('link', { name: 'http://localhost:3000/demo' })).toBeVisible();
    expect(screen.queryByLabelText('Destination URL')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create another' }));

    expect(await screen.findByLabelText('Destination URL')).toHaveValue('');
    expect(screen.getByLabelText('Custom alias (optional)')).toHaveValue('');
  });
});
