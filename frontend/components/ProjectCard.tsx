// ProjectCard.tsx
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';

// Structural subset of the Zod-inferred Project — only the fields we render.
// `| null` covers GraphQL nullable scalars; ProjectCard tolerates both null & undefined.
interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  location?: string | null;
  manager?: { name: string } | null;
  // From the materialCount field resolver (batched COUNT loader) — no need to
  // pull the materials array client-side to render this badge.
  materialCount?: number;
}

export function ProjectCard({ project }: { project: ProjectCardProps }) {
  const materialCount = project.materialCount ?? 0;

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
