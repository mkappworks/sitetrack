import { QueryClient } from '@tanstack/react-query';

// `isServer` from @tanstack/react-query was deprecated in v5;
// the universally-portable check is `typeof window === 'undefined'`.
const isServer = typeof window === 'undefined';

// Canonical Next.js App Router + TanStack Query pattern.
//
// - On the SERVER: every request gets a fresh QueryClient. Sharing one across
//   requests would leak data between users.
// - On the BROWSER: cache a singleton so all Client Components share the cache.
//   Without this, every component re-creating a client would lose hydrated data.
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // staleTime > 0 prevents an immediate refetch on the client right after
        // SSR hydration. 60s is a reasonable default for list views.
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Include pending queries so streamed/suspended renders survive hydration.
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success' || query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
