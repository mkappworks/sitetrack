// ProjectCard.tsx
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  location?: string;
  manager?: { name: string };
  materials?: { status: string }[];
}

export function ProjectCard({ project }: { project: Project }) {
  const materialCount = project.materials?.length ?? 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card hover:shadow-md hover:border-gray-300 transition-all block group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{project.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
        {project.location && <span>📍 {project.location}</span>}
        {project.manager && <span>👤 {project.manager.name}</span>}
        {materialCount > 0 && <span>📦 {materialCount} materials</span>}
      </div>
    </Link>
  );
}
