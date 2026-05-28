import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import { PROJECTS_QUERY } from '../graphql/queries';
import { ProjectsResponseSchema, type ProjectsResponse } from '../graphql/schemas';

// Query-key factory — single source of truth for keys.
// Tuple-style keys let TanStack Query invalidate `['projects']` to nuke all pages.
export const projectsKeys = {
  all: ['projects'] as const,
  list: (limit: number, offset: number) =>
    [...projectsKeys.all, 'list', { limit, offset }] as const,
};

// queryOptions() bundles key + fn + types so server prefetch and client useQuery
// can share the exact same config — no risk of key drift between the two.
export function projectsQueryOptions(opts: {
  limit: number;
  offset: number;
  token?: string;
}) {
  return queryOptions({
    queryKey: projectsKeys.list(opts.limit, opts.offset),
    queryFn: async (): Promise<ProjectsResponse['projects']> => {
      const raw = await gqlFetch<unknown>(
        PROJECTS_QUERY,
        { limit: opts.limit, offset: opts.offset },
        opts.token,
      );
      // Validate at the trust boundary — anything past this point is fully typed.
      // Zod throws a ZodError with a precise path if the shape diverges.
      const parsed = ProjectsResponseSchema.parse(raw);
      return parsed.projects;
    },
  });
}
