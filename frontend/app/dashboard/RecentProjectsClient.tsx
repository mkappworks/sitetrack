'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { projectsQueryOptions } from '../../lib/queries/projects';
import { ProjectCard } from '../../components/ProjectCard';
import { RECENT_PROJECTS_LIMIT } from './RecentProjectsSection';

// Reads the hydrated projects query (prefetched by RecentProjectsSection) and
// stays subscribed, so an optimistic project create/update elsewhere reflects
// here. The queryKey MUST match the section's prefetch exactly (same limit /
// offset) or hydration misses and it refetches.
export function RecentProjectsClient() {
  const { data: session } = useSession();
  const { data } = useQuery({
    ...projectsQueryOptions({
      limit: RECENT_PROJECTS_LIMIT,
      offset: 0,
      token: session?.accessToken,
    }),
    // See StatusSummaryClient: hydrate-then-revalidate so the dashboard
    // reflects changes made elsewhere rather than serving the 60s-stale copy.
    staleTime: 0,
  });

  const items = data?.items ?? [];

  if (items.length === 0) {
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
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
