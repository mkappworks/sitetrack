import { getServerSession } from 'next-auth';
import { gqlClient } from '../../lib/graphql/client';
import { PROJECTS_QUERY } from '../../lib/graphql/queries';
import { authOptions } from '../../lib/auth';
import { ProjectCard } from '../../components/ProjectCard';
import { CreateProjectButton } from '../../components/CreateProjectButton';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  location?: string;
  manager?: { id: string; name: string; email: string };
  materials?: { id: string; status: string }[];
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const client = await gqlClient();

  const data = await client.request<{ projects: Project[] }>(PROJECTS_QUERY);
  const projects = data.projects;

  const canCreate = session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        {canCreate && <CreateProjectButton />}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
