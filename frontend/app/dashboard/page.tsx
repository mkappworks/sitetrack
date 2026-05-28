import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { getQueryClient } from '../../lib/get-query-client';
import {
  projectsQueryOptions,
  projectStatusCountsQueryOptions,
} from '../../lib/queries/projects';
import { ProjectCard } from '../../components/ProjectCard';
import { StatusSummary } from '../../components/StatusSummary';
import { CreateProjectButton } from '../../components/CreateProjectButton';

const RECENT_PROJECTS_LIMIT = 12;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const queryClient = getQueryClient();

  // Two queries, fired in parallel: aggregated counts (correct at any scale),
  // and the most-recent N projects for the grid (a "what's new" view, not a
  // global picture). Previously, both were derived from a single 100-project
  // list — so the status summary lied above 100 projects total.
  const [statusCountsList, projectsPage] = await Promise.all([
    queryClient.fetchQuery(
      projectStatusCountsQueryOptions({ token: session?.accessToken }),
    ),
    queryClient.fetchQuery(
      projectsQueryOptions({
        limit: RECENT_PROJECTS_LIMIT,
        offset: 0,
        token: session?.accessToken,
      }),
    ),
  ]);

  const counts = Object.fromEntries(
    statusCountsList.map((row) => [row.status, row.count]),
  );
  const total = statusCountsList.reduce((sum, row) => sum + row.count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {session?.user.name}
          </p>
        </div>
        {(session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER') && (
          <CreateProjectButton />
        )}
      </div>

      <StatusSummary counts={counts} total={total} />

      {total === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Recent projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectsPage.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
