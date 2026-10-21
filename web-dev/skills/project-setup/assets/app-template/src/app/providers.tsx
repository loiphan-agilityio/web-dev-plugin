import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { Toaster } from '@/components/ui/sonner';
import { createQueryClient } from '@/lib/query-client';

/** App-wide providers. The router is rendered inside, so every route can use them. */
export const AppProviders = ({ children }: { readonly children: ReactNode }) => {
  // One client per mounted app (useState keeps it stable across re-renders).
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors />
    </QueryClientProvider>
  );
};
