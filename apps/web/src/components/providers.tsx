'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query-client';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side provider tree.
 * Add new providers here (e.g., ThemeProvider, ToastProvider) as the app grows.
 *
 * The QueryClient is instantiated with useState to ensure each browser session
 * gets its own client. Server-side rendering uses a separate instance created
 * in the layout Server Component.
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" theme="dark" richColors closeButton />
      {children}
    </QueryClientProvider>
  );
}
