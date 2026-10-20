import { screen } from '@testing-library/react';

import { setSession } from '@/lib/session';
import { renderRoute } from '@/test/render';

import { sessionFixture } from '../mocks';

describe('route guard', () => {
  // '/does-not-exist' matches the app's 404 route: the redirect must win over the 404.
  it.each(['/', '/does-not-exist'])('sends a signed-out visitor from %s to sign in', async (path) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it.each(['/login', '/register'])('sends a signed-in visitor from %s to the app', async (path) => {
    setSession(sessionFixture);
    renderRoute(path);
    expect(await screen.findByRole('heading', { name: 'sample-project' })).toBeInTheDocument();
  });

  it('treats an expired session as signed out', async () => {
    setSession({ ...sessionFixture, expiresAt: '2000-01-01T00:00:00.000Z' });
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
