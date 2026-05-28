'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { projectByIdQueryOptions } from '../../../lib/queries/projects';
import { StatusBadge } from '../../../components/StatusBadge';
import { MaterialsTable } from '../../../components/MaterialsTable';
import { ProjectLiveUpdates } from '../../../components/ProjectLiveUpdates';
import { UpdateStatusForm } from '../../../components/UpdateStatusForm';
import { AddMaterialForm } from '../../../components/AddMaterialForm';

export function ProjectDetailClient({
  id,
  canEdit,
}: {
  id: string;
  canEdit: boolean;
}) {
  const { data: session } = useSession();
  const { data: project } = useQuery(
    projectByIdQueryOptions({ id, token: session?.accessToken }),
  );

  if (!project) return null;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{project.name}</span>
      </nav>

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

        <ProjectLiveUpdates projectId={id} />
      </div>

      {canEdit && (
        <div className="card">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Update status</h2>
          <UpdateStatusForm projectId={project.id} currentStatus={project.status} />
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-900">
            Materials ({project.materials?.length ?? 0})
          </h2>
        </div>

        {project.materials?.length ? (
          <MaterialsTable
            materials={project.materials}
            canEdit={canEdit}
            projectId={project.id}
          />
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
