import { screen, within } from '@testing-library/react';

import { sessionFixture } from '@/features/auth/mocks';
import { setSession } from '@/lib/session';
import { server } from '@/mocks/server';
import { renderRoute } from '@/test/render';

import { createLinksHandlers, makeLinks } from '../../mocks';
import { linkKeys } from '../../queries';

const shortUrl = (code: string) => `http://localhost:3000/${code}`;

// LinkList tests its own states; this checks it together with the route, the URL and the cache.
describe('LinksPage', () => {
  beforeEach(() => {
    setSession(sessionFixture);
  });

  it('lists the links and is the current page in the sidebar', async () => {
    server.use(...createLinksHandlers(makeLinks(3)));
    renderRoute('/links');

    expect(await screen.findByRole('heading', { name: 'Links' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: shortUrl('link-3') })).toBeVisible();
    expect(screen.getByRole('link', { name: 'All links' })).toHaveAttribute('aria-current', 'page');
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Create link' }),
    ).toHaveAttribute('href', '/links/new');
  });

  it('keeps the page in the URL: Next adds ?page=2, Previous removes it', async () => {
    server.use(...createLinksHandlers(makeLinks(25)));
    const { user, router } = renderRoute('/links');

    await user.click(await screen.findByRole('button', { name: 'Next' }));

    // The 21st newest of 25 is link-5.
    expect(await screen.findByRole('link', { name: shortUrl('link-5') })).toBeVisible();
    expect(router.state.location.search).toBe('?page=2');
    expect(screen.queryByRole('link', { name: shortUrl('link-25') })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByRole('link', { name: shortUrl('link-25') })).toBeVisible();
    expect(router.state.location.search).toBe('');
  });

  it('opens straight on the page in the URL', async () => {
    server.use(...createLinksHandlers(makeLinks(25)));
    renderRoute('/links?page=2');

    expect(await screen.findByRole('link', { name: shortUrl('link-5') })).toBeVisible();
    expect(screen.queryByRole('link', { name: shortUrl('link-25') })).not.toBeInTheDocument();
  });

  it.each(['abc', '0', '-2'])('treats ?page=%s as page 1', async (page) => {
    server.use(...createLinksHandlers(makeLinks(25)));
    renderRoute(`/links?page=${page}`);

    expect(await screen.findByRole('link', { name: shortUrl('link-25') })).toBeVisible();
  });

  it('shows a link created on the other page of the app when you come back', async () => {
    server.use(...createLinksHandlers(makeLinks(1)));
    const { user, queryClient } = renderRoute('/links');
    // Without the invalidation in useCreateLink, this cached list would be served as fresh.
    queryClient.setQueryDefaults(linkKeys.lists(), { staleTime: Infinity });
    expect(await screen.findByRole('link', { name: shortUrl('link-1') })).toBeVisible();

    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Create link' }));
    await user.type(await screen.findByLabelText('Destination URL'), 'https://example.com/new');
    await user.type(screen.getByLabelText('Custom alias (optional)'), 'fresh');
    await user.click(screen.getByRole('button', { name: 'Create link' }));
    expect(await screen.findByRole('button', { name: 'Create another' })).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'All links' }));

    const list = await screen.findByRole('list', { name: 'Links' });
    expect(await within(list).findByRole('link', { name: shortUrl('fresh') })).toBeVisible();
  });
});
