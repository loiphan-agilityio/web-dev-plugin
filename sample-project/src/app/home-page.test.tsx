import { screen } from '@testing-library/react';

import { sessionFixture } from '@/features/auth/mocks';
import { setSession } from '@/lib/session';
import { renderRoute } from '@/test/render';

describe('HomePage', () => {
  beforeEach(() => {
    setSession(sessionFixture);
  });

  it('renders at /', async () => {
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'sample-project' })).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown URL', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
