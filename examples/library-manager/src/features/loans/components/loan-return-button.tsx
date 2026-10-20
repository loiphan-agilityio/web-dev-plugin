import { Button } from '@/components/ui/button';

import { useReturnLoan } from '../queries';
import type { Loan } from '../schemas';

/** Records the return of one open loan. The toasts (success, or why it failed) come from the hook. */
export const LoanReturnButton = ({ loan }: { loan: Loan }) => {
  const returnLoan = useReturnLoan();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={returnLoan.isPending}
      aria-label={`Return ${loan.bookTitle} (${loan.memberName})`}
      onClick={() => {
        returnLoan.mutate(loan.id);
      }}
    >
      {returnLoan.isPending ? 'Returning…' : 'Return'}
    </Button>
  );
};
