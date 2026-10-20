import { screen } from '@testing-library/react';

import { renderRoute } from '@/test/render';

describe('HomePage', () => {
  it('renders at /', async () => {
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: 'app-template' })).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown URL', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
