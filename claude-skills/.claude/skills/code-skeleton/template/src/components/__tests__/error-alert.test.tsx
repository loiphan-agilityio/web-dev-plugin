import { screen } from '@testing-library/react';

import { ServerError } from '@/lib/api/errors';
import { renderWithProviders } from '@/test/render';

import { ErrorAlert } from '../error-alert';

const error = new ServerError({ status: 500 });

describe('ErrorAlert', () => {
  it('shows the title and the user-facing message, not the raw error', async () => {
    renderWithProviders(<ErrorAlert title="Could not load todos" error={error} />);
    expect(await screen.findByText('Could not load todos')).toBeInTheDocument();
    expect(
      screen.getByText('Something went wrong on our side. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('calls onRetry from the Try again button', async () => {
    const onRetry = vi.fn();
    const { user } = renderWithProviders(
      <ErrorAlert title="Could not load todos" error={error} onRetry={onRetry} />,
    );
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('disables the button while retrying', async () => {
    renderWithProviders(
      <ErrorAlert title="Could not load todos" error={error} onRetry={vi.fn()} retrying />,
    );
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeDisabled();
  });
});
