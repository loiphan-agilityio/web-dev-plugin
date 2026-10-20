import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { linkFixture } from '../../mocks';
import { CopyLinkButton } from '../copy-link-button';

describe('CopyLinkButton', () => {
  it('copies the URL', async () => {
    const { user } = renderWithProviders(<CopyLinkButton url={linkFixture.shortUrl} />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(linkFixture.shortUrl);
  });

  it('says so when the browser refuses to copy', async () => {
    const { user } = renderWithProviders(<CopyLinkButton url={linkFixture.shortUrl} />);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByText(/Could not copy the link/)).toBeInTheDocument();
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument();
  });

  it('passes button props through, so a row can name its own button', () => {
    renderWithProviders(
      <CopyLinkButton url={linkFixture.shortUrl} aria-label={`Copy ${linkFixture.shortUrl}`} />,
    );

    expect(screen.getByRole('button', { name: `Copy ${linkFixture.shortUrl}` })).toBeEnabled();
  });
});
