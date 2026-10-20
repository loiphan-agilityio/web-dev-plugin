import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';

import { config } from '@/lib/config';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createLinksHandlers, linkFixture, linksMocks } from '../../mocks';
import { CreateLinkForm } from '../create-link-form';

const submit = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Create link' }));

const typeUrl = (user: UserEvent, value = 'https://example.com/a') =>
  user.type(screen.getByLabelText('Destination URL'), value);

describe('CreateLinkForm', () => {
  it('asks for the URL', async () => {
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);

    await submit(user);

    expect(await screen.findByText('Destination URL is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Destination URL')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a URL that is not http(s)', async () => {
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);

    await typeUrl(user, 'ftp://example.com');
    await submit(user);

    expect(
      await screen.findByText('Enter a URL that starts with http:// or https://'),
    ).toBeInTheDocument();
  });

  it('rejects a malformed or reserved alias', async () => {
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);
    await typeUrl(user);

    await user.type(screen.getByLabelText('Custom alias (optional)'), 'a b');
    await submit(user);
    expect(
      await screen.findByText('Alias must be 3-32 letters, digits, _ or -'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Custom alias (optional)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await user.clear(screen.getByLabelText('Custom alias (optional)'));
    await user.type(screen.getByLabelText('Custom alias (optional)'), 'api');
    await submit(user);
    expect(await screen.findByText('"api" is reserved, pick another alias')).toBeInTheDocument();
  });

  it('rejects an expiry in the past', async () => {
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);
    await typeUrl(user);

    await user.type(screen.getByLabelText('Expires (optional)'), '2000-01-01T10:00');
    await submit(user);

    expect(await screen.findByText('Expiry must be in the future')).toBeInTheDocument();
  });

  it('describes the alias field', () => {
    renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);
    expect(screen.getByLabelText('Custom alias (optional)')).toHaveAccessibleDescription(
      'Leave empty for a random code',
    );
  });

  it('sends only the URL when alias and expiry are empty, then calls onCreated', async () => {
    const bodies: unknown[] = [];
    const onCreated = vi.fn();
    // A later server.use() call wins: this records the body, then answers like the real one.
    server.use(
      http.post(`${config.apiUrl}/links`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(linkFixture, { status: 201 });
      }),
    );
    const { user } = renderWithProviders(<CreateLinkForm onCreated={onCreated} />);

    await typeUrl(user, '  https://example.com/a  ');
    await submit(user);

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(linkFixture);
    });
    expect(bodies).toEqual([{ url: 'https://example.com/a' }]);
    expect(await screen.findByText('Link created')).toBeInTheDocument();
  });

  it('sends the alias and the expiry as ISO 8601', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${config.apiUrl}/links`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(linkFixture, { status: 201 });
      }),
    );
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);

    await typeUrl(user);
    await user.type(screen.getByLabelText('Custom alias (optional)'), 'demo');
    await user.type(screen.getByLabelText('Expires (optional)'), '2099-01-01T10:00');
    await submit(user);

    await waitFor(() => {
      expect(bodies).toEqual([
        {
          url: 'https://example.com/a',
          alias: 'demo',
          // Local time in, so build the expectation the same way: the test passes in any zone.
          expiresAt: new Date('2099-01-01T10:00').toISOString(),
        },
      ]);
    });
  });

  it('shows the API message when the alias is taken', async () => {
    server.use(...createLinksHandlers([{ ...linkFixture, code: 'demo' }]));
    const onCreated = vi.fn();
    const { user } = renderWithProviders(<CreateLinkForm onCreated={onCreated} />);

    await typeUrl(user);
    await user.type(screen.getByLabelText('Custom alias (optional)'), 'demo');
    await submit(user);

    expect(await screen.findByText('Alias "demo" is already taken')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows a server failure on the form', async () => {
    server.use(linksMocks.fail(500));
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);

    await typeUrl(user);
    await submit(user);

    expect(
      await screen.findByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
  });

  it('disables the button while the link is being created', async () => {
    server.use(linksMocks.createPending());
    const { user } = renderWithProviders(<CreateLinkForm onCreated={vi.fn()} />);

    await typeUrl(user);
    await submit(user);

    expect(await screen.findByRole('button', { name: 'Creating…' })).toBeDisabled();
  });
});
