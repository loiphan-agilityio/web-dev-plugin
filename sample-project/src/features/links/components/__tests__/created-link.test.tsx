import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { linkFixture } from '../../mocks';
import { CreatedLink } from '../created-link';

describe('CreatedLink', () => {
  it('links to the short URL', () => {
    renderWithProviders(<CreatedLink link={linkFixture} onCreateAnother={vi.fn()} />);

    expect(screen.getByRole('link', { name: linkFixture.shortUrl })).toHaveAttribute(
      'href',
      linkFixture.shortUrl,
    );
    expect(screen.getByText(linkFixture.url)).toBeInTheDocument();
  });

  it('starts over with Create another', async () => {
    const onCreateAnother = vi.fn();
    const { user } = renderWithProviders(
      <CreatedLink link={linkFixture} onCreateAnother={onCreateAnother} />,
    );

    await user.click(screen.getByRole('button', { name: 'Create another' }));

    expect(onCreateAnother).toHaveBeenCalledOnce();
  });

  it('shows the expiry only when the link has one', () => {
    const { rerender } = renderWithProviders(
      <CreatedLink link={linkFixture} onCreateAnother={vi.fn()} />,
    );
    expect(screen.queryByText('Expires:')).not.toBeInTheDocument();

    rerender(
      <CreatedLink
        link={{ ...linkFixture, expiresAt: '2099-01-01T10:00:00.000Z' }}
        onCreateAnother={vi.fn()}
      />,
    );
    expect(screen.getByText('Expires:')).toBeInTheDocument();
  });
});
