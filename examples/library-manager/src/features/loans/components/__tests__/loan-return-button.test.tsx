import { screen } from '@testing-library/react';

import { createLibraryDb } from '@/mocks/library-db';
import { loanFixtures } from '@/mocks/library-fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { createLoansHandlers, loansMocks } from '../../mocks';
import { LoanReturnButton } from '../loan-return-button';

// Loan 4 is active and due today.
const loan = loanFixtures[3];
assert(loan, 'the fixtures hold an open loan');
const name = `Return ${loan.bookTitle} (${loan.memberName})`;

describe('LoanReturnButton', () => {
  it('records the return and shows a toast', async () => {
    server.use(...createLoansHandlers(createLibraryDb({ loans: loanFixtures })));
    const { user } = renderWithProviders(<LoanReturnButton loan={loan} />);

    await user.click(screen.getByRole('button', { name }));

    expect(await screen.findByText('Return recorded')).toBeInTheDocument();
  });

  it('is disabled while the return is being recorded', async () => {
    server.use(loansMocks.returnPending());
    const { user } = renderWithProviders(<LoanReturnButton loan={loan} />);

    await user.click(screen.getByRole('button', { name }));

    expect(await screen.findByRole('button', { name })).toBeDisabled();
    expect(screen.getByRole('button', { name })).toHaveTextContent('Returning…');
  });

  it('shows the reason when the loan was already returned', async () => {
    server.use(loansMocks.returnConflict('This loan was already returned.'));
    const { user } = renderWithProviders(<LoanReturnButton loan={loan} />);

    await user.click(screen.getByRole('button', { name }));

    expect(await screen.findByText('This loan was already returned.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name })).toBeEnabled();
  });

  it('shows a message when the loan no longer exists', async () => {
    server.use(loansMocks.returnNotFound());
    const { user } = renderWithProviders(<LoanReturnButton loan={loan} />);

    await user.click(screen.getByRole('button', { name }));

    expect(await screen.findByText(/We could not find/)).toBeInTheDocument();
  });
});
