import { act, screen, within } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { TaskFilters } from '../task-filters';

const statusButtons = () => within(screen.getByRole('group', { name: 'Status' }));

describe('TaskFilters', () => {
  it('starts on All with an empty search', () => {
    renderWithProviders(<TaskFilters />);
    expect(statusButtons().getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('offers All, To do, In progress and Done', () => {
    renderWithProviders(<TaskFilters />);
    const names = statusButtons()
      .getAllByRole('button')
      .map(({ textContent }) => textContent);
    expect(names).toEqual(['All', 'To do', 'In progress', 'Done']);
  });

  it('writes the status to the URL and removes it for All', async () => {
    const { user, router } = renderWithProviders(<TaskFilters />);

    await user.click(statusButtons().getByRole('button', { name: 'In progress' }));
    expect(router.state.location.search).toBe('?status=in_progress');
    expect(statusButtons().getByRole('button', { name: 'In progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(statusButtons().getByRole('button', { name: 'All' }));
    expect(router.state.location.search).toBe('');
  });

  it('writes the search to the URL and keeps the status', async () => {
    const { user, router } = renderWithProviders(<TaskFilters />);

    await user.click(statusButtons().getByRole('button', { name: 'Done' }));
    await user.type(screen.getByLabelText('Search'), 'report');

    expect(router.state.location.search).toBe('?status=done&q=report');
  });

  it('shows the filters that are already in the URL', async () => {
    const { router } = renderWithProviders(<TaskFilters />);

    await act(() => router.navigate('/?status=in_progress&q=report'));

    expect(statusButtons().getByRole('button', { name: 'In progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Search')).toHaveValue('report');
  });
});
