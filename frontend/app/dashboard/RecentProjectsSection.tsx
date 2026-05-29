import { getQueryClient } from '../../lib/get-query-client';
import { projectsQueryOptions } from '../../lib/queries/projects';
import { ProjectCard } from '../../components/ProjectCard';

const RECENT_PROJECTS_LIMIT = 12;

// Async server component: fetches the most-recent projects independently of
// the status summary, so a slow list never blocks the rest of the dashboard
// from painting. Owns its own empty state.
export async function RecentProjectsSection({ token }: { token: string }) {
  const page = await getQueryClient().fetchQuery(
    projectsQueryOptions({ limit: RECENT_PROJECTS_LIMIT, offset: 0, token }),
  );

  if (page.items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No projects yet</p>
        <p className="text-sm mt-1">Create your first project to get started</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-medium text-gray-500 mb-3">Recent projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {page.items.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
