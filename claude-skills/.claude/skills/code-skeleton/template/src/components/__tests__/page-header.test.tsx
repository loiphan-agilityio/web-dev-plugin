import { screen } from '@testing-library/react';

import { Button } from '@/components/ui/button';
import { renderWithProviders } from '@/test/render';

import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders the title as the page heading', async () => {
    renderWithProviders(<PageHeader title="Todos" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Todos' })).toBeInTheDocument();
  });

  it('renders the description and the actions when given', async () => {
    renderWithProviders(
      <PageHeader
        title="Todos"
        description="Everything left to do."
        actions={<Button type="button">New todo</Button>}
      />,
    );
    expect(await screen.findByText('Everything left to do.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New todo' })).toBeInTheDocument();
  });
});
