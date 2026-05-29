import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '../../lib/get-query-client';
import { projectStatusCountsQueryOptions } from '../../lib/queries/projects';
import { StatusSummaryClient } from './StatusSummaryClient';

// Pattern C: awaiting INSIDE the section (not the page) lets its own
// <Suspense> stream independently; the HydrationBoundary then gives the
// client child SSR-baked data AND a live cache subscription. getQueryClient()
// is fresh per server call, so this payload carries only the status query.
export async function StatusSummarySection({ token }: { token: string }) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(projectStatusCountsQueryOptions({ token }));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatusSummaryClient />
    </HydrationBoundary>
  );
}
