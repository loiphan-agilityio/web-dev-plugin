import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { MemoryRouter } from 'react-router';

import { Toaster } from '@/components/ui/sonner';
import { createTestQueryClient } from '@/test/query-client';

/** The providers a test gets (src/test/render.tsx): a fresh client without retries, a router, the Toaster. */
export const StoryProviders = ({ children }: { readonly children: ReactNode }) => {
  const [queryClient] = useState(createTestQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
      <Toaster richColors />
    </QueryClientProvider>
  );
};
