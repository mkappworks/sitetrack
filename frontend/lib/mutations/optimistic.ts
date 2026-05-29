'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

interface OptimisticDetailOptions<TInput, TData, TCache> {
  // The write. Callers pass `(input) => unwrap(someAction(input))`.
  mutationFn: (input: TInput) => Promise<TData>;
  // The detail-cache key this mutation optimistically patches. A function of
  // the input so it works both for fixed keys (material hooks close over a
  // projectId) and input-derived keys (status patches keys off input.id).
  detailKey: (input: TInput) => QueryKey;
  // Pure transform: cached entity + input → patched entity. Called only when
  // there's cached data to patch.
  patch: (cached: TCache, input: TInput) => TCache;
  // Extra keys to invalidate on settle, beyond the detail key (e.g. list
  // views that show the patched field).
  extraInvalidateKeys?: (input: TInput) => QueryKey[];
}

// Extracted skeleton for the snapshot → patch → rollback → invalidate
// lifecycle that every optimistic detail mutation in the app repeats.
// Rollback restores the pre-mutation snapshot (no inverse function needed).
// The lifecycle contract is locked by lib/mutations/projects.test.ts via
// useUpdateProjectStatus, which is built on this helper.
export function useOptimisticDetailMutation<TInput, TData, TCache>(
  options: OptimisticDetailOptions<TInput, TData, TCache>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (input: TInput) => {
      const key = options.detailKey(input);
      // Cancel in-flight refetches so they can't clobber the optimistic patch.
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<TCache>(key);
      queryClient.setQueryData<TCache>(key, (old) =>
        old ? options.patch(old, input) : old,
      );
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      // Restore the snapshot. Guard on `prev` (undefined = nothing cached to
      // restore) so we don't write undefined into the cache.
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: options.detailKey(input) });
      options.extraInvalidateKeys?.(input).forEach((k) =>
        queryClient.invalidateQueries({ queryKey: k }),
      );
    },
  });
}
