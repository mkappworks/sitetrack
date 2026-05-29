import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '../../lib/get-query-client';
import { projectStatusCountsQueryOptions } from '../../lib/queries/projects';
import { StatusSummaryClient } from './StatusSummaryClient';

// Async server component: awaits the (cheap) status aggregate, so this
// section's own <Suspense> boundary streams independently of the projects
// list. Then dehydrates the result into a HydrationBoundary so the client
// child renders from SSR-baked data AND stays subscribed to the cache
// (reactive to mutations made elsewhere). getQueryClient() is a fresh client
// per server call, so this payload carries only the status-counts query.
export async function StatusSummarySection({ token }: { token: string }) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(projectStatusCountsQueryOptions({ token }));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatusSummaryClient />
    </HydrationBoundary>
  );
}
