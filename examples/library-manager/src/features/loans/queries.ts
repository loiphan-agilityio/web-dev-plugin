import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { bookKeys } from '@/features/books/queries';
import { toUserMessage } from '@/lib/api/errors';
import { runEffect } from '@/lib/api/run';

import { createLoan, getLoanStats, listLoans, returnLoan } from './api';
import type { NewLoan } from './schemas';

/** Every loan query key comes from here, so invalidation can target exactly what changed. */
export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  stats: () => [...loanKeys.all, 'stats'] as const,
};

export const loanListQueryOptions = () =>
  queryOptions({
    queryKey: loanKeys.lists(),
    queryFn: ({ signal }) => runEffect(listLoans(), signal),
  });

/** Always refetched when a screen mounts: the numbers change with every lend and return. */
export const loanStatsQueryOptions = () =>
  queryOptions({
    queryKey: loanKeys.stats(),
    queryFn: ({ signal }) => runEffect(getLoanStats(), signal),
    staleTime: 0,
  });

/** A lend or a return changes the loans, the stats and the copies each book shows. */
const useInvalidateAfterLoanChange = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: loanKeys.all }),
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() }),
    ]);
};

export const useCreateLoan = () => {
  const invalidate = useInvalidateAfterLoanChange();
  return useMutation({
    mutationFn: (input: NewLoan) => runEffect(createLoan(input)),
    // Returning the promise keeps the mutation pending until the lists have refetched.
    onSuccess: invalidate,
  });
};

/**
 * The toasts live here, not at the call site: once the loan is returned its Return button
 * unmounts, and TanStack Query drops the callbacks passed to `mutate` for an unmounted component.
 */
export const useReturnLoan = () => {
  const invalidate = useInvalidateAfterLoanChange();
  return useMutation({
    mutationFn: (id: number) => runEffect(returnLoan(id)),
    onSuccess: () => {
      toast.success('Return recorded');
      return invalidate();
    },
    onError: (error) => {
      toast.error(toUserMessage(error));
    },
  });
};
