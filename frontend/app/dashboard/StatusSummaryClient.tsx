'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { projectStatusCountsQueryOptions } from '../../lib/queries/projects';
import { StatusSummary } from '../../components/StatusSummary';

// Reads the hydrated status-counts query (prefetched by StatusSummarySection)
// and stays subscribed so optimistic project-status mutations elsewhere
// reflect here. token (for any post-staleTime refetch) comes from the session;
// the hydrated entry means no fetch on first paint.
export function StatusSummaryClient() {
  const { data: session } = useSession();
  const { data = [] } = useQuery(
    projectStatusCountsQueryOptions({ token: session?.accessToken }),
  );
  const counts = Object.fromEntries(data.map((row) => [row.status, row.count]));
  const total = data.reduce((sum, row) => sum + row.count, 0);
  return <StatusSummary counts={counts} total={total} />;
}
