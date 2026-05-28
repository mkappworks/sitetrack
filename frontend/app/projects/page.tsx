import { getServerSession } from 'next-auth';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { authOptions } from '../../lib/auth';
import { getQueryClient } from '../../lib/get-query-client';
import { projectsQueryOptions } from '../../lib/queries/projects';
import { CreateProjectButton } from '../../components/CreateProjectButton';
import { ProjectsListClient } from './ProjectsListClient';

const PAGE_SIZE = 20;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const search = q?.trim() || undefined;

  const session = await getServerSession(authOptions);
  const canCreate =
    session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    projectsQueryOptions({
      limit: PAGE_SIZE,
      offset,
      search,
      token: session?.accessToken,
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        </div>
        {canCreate && <CreateProjectButton />}
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectsListClient page={page} pageSize={PAGE_SIZE} search={search} />
      </HydrationBoundary>
    </div>
  );
}
