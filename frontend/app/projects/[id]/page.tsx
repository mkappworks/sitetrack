import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '../../../lib/auth';
import { getQueryClient } from '../../../lib/get-query-client';
import { projectByIdQueryOptions } from '../../../lib/queries/projects';
import type { Project } from '../../../lib/graphql/schemas';
import { StatusBadge } from '../../../components/StatusBadge';
import { MaterialsTable } from '../../../components/MaterialsTable';
import { ProjectLiveUpdates } from '../../../components/ProjectLiveUpdates';
import { UpdateStatusForm } from '../../../components/UpdateStatusForm';
import { AddMaterialForm } from '../../../components/AddMaterialForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  // fetchQuery returns the data directly — the right primitive for a Server
  // Component that renders in place. queryFn handles Zod validation; any
  // failure (404 from the backend, schema drift, network) throws here.
  let project: Project;
  try {
    const queryClient = getQueryClient();
    project = await queryClient.fetchQuery(
      projectByIdQueryOptions({ id, token: session?.accessToken }),
    );
  } catch {
    notFound();
  }

  const canEdit = session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{project.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="text-gray-500 mt-1">{project.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-gray-400">
            {project.location && <span>📍 {project.location}</span>}
            {project.manager && <span>👤 {project.manager.name}</span>}
          </div>
        </div>

        {/* Live update indicator — CLIENT COMPONENT */}
        <ProjectLiveUpdates projectId={id} />
      </div>

      {/* Status update — only for editors */}
      {canEdit && (
        <div className="card">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Update status</h2>
          {/* Server Action — no API route needed */}
          <UpdateStatusForm projectId={project.id} currentStatus={project.status} />
        </div>
      )}

      {/* Materials section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-900">
            Materials ({project.materials?.length ?? 0})
          </h2>
        </div>

        {project.materials?.length ? (
          <MaterialsTable materials={project.materials} canEdit={canEdit} />
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No materials added yet</p>
        )}

        {canEdit && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <AddMaterialForm projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  );
}
