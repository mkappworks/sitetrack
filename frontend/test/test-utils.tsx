import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, type RenderOptions } from '@testing-library/react';

// Fresh QueryClient per test so cache state doesn't leak across cases.
// Retries off because tests want failures to surface immediately, not get retried.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function renderWithQueryClient(
  ui: ReactNode,
  options?: RenderOptions & { client?: QueryClient },
) {
  const client = options?.client ?? makeQueryClient();
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, options),
  };
}

export function renderHookWithQueryClient<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: { client?: QueryClient; initialProps?: TProps },
) {
  const client = options?.client ?? makeQueryClient();
  return {
    client,
    ...renderHook(callback, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
      initialProps: options?.initialProps,
    }),
  };
}
