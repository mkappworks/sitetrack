import { getServerSession } from 'next-auth';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { authOptions } from '../../lib/auth';
import { getQueryClient } from '../../lib/get-query-client';
import { projectsQueryOptions } from '../../lib/queries/projects';
import { CreateProjectButton } from '../../components/CreateProjectButton';
import { ProjectsListClient } from './ProjectsListClient';

const PAGE_SIZE = 20;

// searchParams is async in Next.js 15+: it's a Promise we must await.
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const session = await getServerSession(authOptions);
  const canCreate =
    session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';

  // Per-request QueryClient on the server (isServer branch of getQueryClient).
  const queryClient = getQueryClient();
  // Server-side prefetch — by the time the Client Component mounts, the cache
  // already has the data for this key. No client-side fetch on first paint.
  await queryClient.prefetchQuery(
    projectsQueryOptions({
      limit: PAGE_SIZE,
      offset,
      token: session?.accessToken,
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          {/* The count comes from the hydrated query — see ProjectsListClient header */}
        </div>
        {canCreate && <CreateProjectButton />}
      </div>

      {/* dehydrate() serialises the cache; HydrationBoundary rehydrates it client-side */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectsListClient page={page} pageSize={PAGE_SIZE} />
      </HydrationBoundary>
    </div>
  );
}
