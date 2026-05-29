import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '../../lib/get-query-client';
import { projectsQueryOptions } from '../../lib/queries/projects';
import { RecentProjectsClient } from './RecentProjectsClient';

export const RECENT_PROJECTS_LIMIT = 12;

// Pattern C, mirror of StatusSummarySection (see there for the rationale).
export async function RecentProjectsSection({ token }: { token: string }) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    projectsQueryOptions({ limit: RECENT_PROJECTS_LIMIT, offset: 0, token }),
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecentProjectsClient />
    </HydrationBoundary>
  );
}
