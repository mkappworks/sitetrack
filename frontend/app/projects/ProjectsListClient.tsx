'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { ProjectCard } from '../../components/ProjectCard';
import { projectsQueryOptions } from '../../lib/queries/projects';

interface Props {
  page: number;
  pageSize: number;
}

export function ProjectsListClient({ page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const offset = (page - 1) * pageSize;

  // queryOptions() shared with the Server Component prefetch — same key, same fn.
  // The token comes from the client-side session here; the server-side prefetch
  // passed its own. The queryKey deliberately excludes the token so the hydrated
  // entry matches the client's first useQuery call.
  const { data, isLoading, isError, error } = useQuery(
    projectsQueryOptions({
      limit: pageSize,
      offset,
      token: session?.accessToken,
    }),
  );

  if (isLoading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Loading…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-red-500">
        <p className="text-sm">Failed to load projects: {error.message}</p>
      </div>
    );
  }

  // After Zod validation in projectsQueryOptions, `data` is fully typed.
  const projects = data!.items;
  const total = data!.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // URL-driven pagination — back/forward and shareable links Just Work.
  const goToPage = (next: number) => {
    const params = new URLSearchParams();
    if (next > 1) params.set('page', String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <>
      <p className="text-sm text-gray-500 -mt-6 mb-6">
        {total} {total === 1 ? 'project' : 'projects'}
      </p>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <nav
            aria-label="Pagination"
            className="mt-8 flex items-center justify-between text-sm"
          >
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrev}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNext}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </nav>
        </>
      )}
    </>
  );
}
