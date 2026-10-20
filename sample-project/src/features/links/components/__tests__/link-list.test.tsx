import { screen, within } from '@testing-library/react';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createLinksHandlers, linkFixture, linksMocks, makeLinks } from '../../mocks';
import { LinkList } from '../link-list';

describe('LinkList', () => {
  it('shows a loading state before the first response', async () => {
    server.use(linksMocks.listPending());
    renderWithProviders(<LinkList page={1} onPageChange={vi.fn()} />);

    expect(await screen.findByRole('status', { name: 'Loading links' })).toBeInTheDocument();
  });

  it('shows an error with a retry that recovers', async () => {
    server.use(linksMocks.listFail(500));
    const { user } = renderWithProviders(<LinkList page={1} onPageChange={vi.fn()} />);
    expect(await screen.findByText('Could not load links')).toBeInTheDocument();
    expect(screen.getByText(/went wrong on our side/)).toBeInTheDocument();

    server.use(...createLinksHandlers(makeLinks(1)));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('list', { name: 'Links' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an empty state that is not an error and leads to Create link', async () => {
    server.use(...createLinksHandlers([]));
    renderWithProviders(<LinkList page={1} onPageChange={vi.fn()} />);

    expect(await screen.findByText('You have no links yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first link' })).toHaveAttribute(
      'href',
      '/links/new',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows each link newest first, with Expired only on a link that has expired', async () => {
    const plain = { ...linkFixture, code: 'plain', shortUrl: 'http://localhost:3000/plain' };
    const active = {
      ...linkFixture,
      code: 'active',
      shortUrl: 'http://localhost:3000/active',
      clicks: 1,
      expiresAt: '2099-01-01T10:00:00.000Z',
    };
    const expired = {
      ...linkFixture,
      code: 'expired',
      shortUrl: 'http://localhost:3000/expired',
      clicks: 3,
      expiresAt: '2000-01-01T10:00:00.000Z',
    };
    // Stored oldest first, listed newest first.
    server.use(...createLinksHandlers([plain, active, expired]));
    renderWithProviders(<LinkList page={1} onPageChange={vi.fn()} />);

    const rows = within(await screen.findByRole('list', { name: 'Links' })).getAllByRole(
      'listitem',
    );
    expect(rows).toHaveLength(3);

    const [expiredRow, activeRow, plainRow] = rows as [HTMLElement, HTMLElement, HTMLElement];
    expect(within(expiredRow).getByRole('link', { name: expired.shortUrl })).toHaveAttribute(
      'href',
      expired.shortUrl,
    );
    expect(expiredRow).toHaveTextContent(expired.url);
    expect(expiredRow).toHaveTextContent('3 clicks');
    expect(within(expiredRow).getByText('Expired')).toBeInTheDocument();
    expect(
      within(expiredRow).getByRole('button', { name: `Copy ${expired.shortUrl}` }),
    ).toBeEnabled();

    expect(activeRow).toHaveTextContent('1 click ·');
    expect(activeRow).toHaveTextContent('Expires');
    expect(within(activeRow).queryByText('Expired')).not.toBeInTheDocument();

    expect(plainRow).toHaveTextContent('0 clicks');
    expect(plainRow).not.toHaveTextContent('Expires');
    expect(within(plainRow).queryByText('Expired')).not.toBeInTheDocument();

    // 3 links fit on one page: no pager.
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('pages: the first page of 25 offers Next only', async () => {
    server.use(...createLinksHandlers(makeLinks(25)));
    const onPageChange = vi.fn();
    const { user } = renderWithProviders(<LinkList page={1} onPageChange={onPageChange} />);

    const list = await screen.findByRole('list', { name: 'Links' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(20);
    expect(within(list).getByRole('link', { name: 'http://localhost:3000/link-25' })).toBeVisible();
    expect(screen.getByText('Showing 1–20 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('pages: the last page offers Previous only', async () => {
    server.use(...createLinksHandlers(makeLinks(25)));
    const onPageChange = vi.fn();
    const { user } = renderWithProviders(<LinkList page={2} onPageChange={onPageChange} />);

    const list = await screen.findByRole('list', { name: 'Links' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('says so when the page is past the last one', async () => {
    server.use(...createLinksHandlers(makeLinks(3)));
    renderWithProviders(<LinkList page={5} onPageChange={vi.fn()} />);

    expect(await screen.findByText('There are no links on page 5.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the first page' })).toHaveAttribute(
      'href',
      '/links',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
