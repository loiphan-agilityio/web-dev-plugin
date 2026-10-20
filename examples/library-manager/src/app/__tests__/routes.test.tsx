import { screen, within } from '@testing-library/react';

import { createLibraryHandlers } from '@/mocks/library-handlers';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

describe('routes', () => {
  it('opens on the Loans page', async () => {
    server.use(...createLibraryHandlers());
    const { router } = renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'Loans' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/loans');
  });

  it('links to every page from the header and marks the current one', async () => {
    server.use(...createLibraryHandlers());
    const { user } = renderRoute('/loans');
    await screen.findByRole('heading', { name: 'Loans' });
    const nav = screen.getByRole('navigation', { name: 'Main' });

    await user.click(within(nav).getByRole('link', { name: 'Books' }));
    expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Books' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(nav).getByRole('link', { name: 'Members' }));
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Overview' }));
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown URL', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
