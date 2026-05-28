// SERVER COMPONENT — fetches data directly, no useEffect, no loading spinner
// Data is available when the HTML arrives at the browser

import { gqlClient } from '../../lib/graphql/client';
import { PROJECTS_QUERY } from '../../lib/graphql/queries';
import { ProjectCard } from '../../components/ProjectCard';
import { StatusSummary } from '../../components/StatusSummary';
import { CreateProjectButton } from '../../components/CreateProjectButton';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  manager?: { id: string; name: string; email: string } | null;
  materials?: { id: string; status: string }[];
}

interface ProjectsPage {
  items: Project[];
  total: number;
}

// Dashboard renders a status summary — needs the first page of projects.
// For a learning-scale dataset 100 is plenty; at production scale this would
// move to a dedicated stats endpoint that returns counts only.
const DASHBOARD_PAGE_SIZE = 100;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const client = await gqlClient();

  const data = await client.request<{ projects: ProjectsPage }>(PROJECTS_QUERY, {
    limit: DASHBOARD_PAGE_SIZE,
    offset: 0,
  });
  const projects = data.projects.items;

  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

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

      {/* Status summary bar */}
      <StatusSummary counts={statusCounts} total={projects.length} />

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
