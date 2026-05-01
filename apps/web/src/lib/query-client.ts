import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a new QueryClient instance with sensible defaults.
 * Call this in a client component — do NOT create a singleton on the module level
 * because the same instance would be shared across requests on the server.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
