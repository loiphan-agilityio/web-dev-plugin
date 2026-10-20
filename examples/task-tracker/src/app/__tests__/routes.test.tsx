import { screen } from '@testing-library/react';

import { renderRoute } from '@/test/render';

describe('createRoutes', () => {
  it('shows the not-found page for an unknown URL', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
