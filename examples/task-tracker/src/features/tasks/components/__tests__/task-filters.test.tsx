import { act, screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/render';

import { TaskFilters } from '../task-filters';

const statusButton = (name: string) => screen.getByRole('button', { name });

describe('TaskFilters', () => {
  it('starts on all tasks with an empty search', () => {
    renderWithProviders(<TaskFilters />);
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Search by title')).toHaveValue('');
  });

  it('offers every status', () => {
    renderWithProviders(<TaskFilters />);
    const group = screen.getByRole('group', { name: 'Status' });
    const labels = Array.from(group.querySelectorAll('button')).map((button) => button.textContent);
    expect(labels).toEqual(['All', 'To do', 'In progress', 'Done']);
  });

  it('writes the status to the URL, and drops it for All', async () => {
    const { user, router } = renderWithProviders(<TaskFilters />);

    await user.click(statusButton('In progress'));
    expect(router.state.location.search).toBe('?status=in_progress');
    expect(statusButton('In progress')).toHaveAttribute('aria-pressed', 'true');
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'false');

    await user.click(statusButton('All'));
    expect(router.state.location.search).toBe('');
  });

  it('writes the search to the URL without adding history entries', async () => {
    const { user, router } = renderWithProviders(<TaskFilters />);
    const historyLength = window.history.length;

    await user.type(screen.getByLabelText('Search by title'), 'report');

    expect(router.state.location.search).toBe('?q=report');
    expect(window.history.length).toBe(historyLength);
  });

  it('keeps the other filter when one changes', async () => {
    const { user, router } = renderWithProviders(<TaskFilters />);

    await user.click(statusButton('Done'));
    await user.type(screen.getByLabelText('Search by title'), 'a');

    expect(new URLSearchParams(router.state.location.search).toString()).toBe('status=done&q=a');
  });

  it('shows the filters from the URL', async () => {
    const { router } = renderWithProviders(<TaskFilters />);

    await act(() => router.navigate('/?status=in_progress&q=report'));

    expect(statusButton('In progress')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Search by title')).toHaveValue('report');
  });
});
