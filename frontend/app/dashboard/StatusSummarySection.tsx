import { getQueryClient } from '../../lib/get-query-client';
import { projectStatusCountsQueryOptions } from '../../lib/queries/projects';
import { StatusSummary } from '../../components/StatusSummary';

// Async server component: fetches the (cheap) status aggregate independently
// so it can stream in as soon as it's ready, without waiting on the slower
// projects list. Wrapped in <Suspense> by the page.
export async function StatusSummarySection({ token }: { token: string }) {
  const list = await getQueryClient().fetchQuery(
    projectStatusCountsQueryOptions({ token }),
  );
  const counts = Object.fromEntries(list.map((row) => [row.status, row.count]));
  const total = list.reduce((sum, row) => sum + row.count, 0);
  return <StatusSummary counts={counts} total={total} />;
}
