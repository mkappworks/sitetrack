import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import {
  PROJECTS_QUERY,
  PROJECT_QUERY,
  PROJECT_STATUS_COUNTS_QUERY,
} from '../graphql/queries';
import {
  ProjectsResponseSchema,
  ProjectByIdResponseSchema,
  ProjectStatusCountsResponseSchema,
  type ProjectsResponse,
  type Project,
  type ProjectStatusCount,
} from '../graphql/schemas';

export const projectsKeys = {
  all: ['projects'] as const,
  list: (limit: number, offset: number, search: string | undefined) =>
    [...projectsKeys.all, 'list', { limit, offset, search: search || undefined }] as const,
  detail: (id: string) => [...projectsKeys.all, 'detail', id] as const,
  statusCounts: () => [...projectsKeys.all, 'status-counts'] as const,
};

export function projectsQueryOptions(opts: {
  limit: number;
  offset: number;
  search?: string;
  token?: string;
}) {
  return queryOptions({
    queryKey: projectsKeys.list(opts.limit, opts.offset, opts.search),
    queryFn: async (): Promise<ProjectsResponse['projects']> => {
      const raw = await gqlFetch<unknown>(
        PROJECTS_QUERY,
        { limit: opts.limit, offset: opts.offset, search: opts.search || null },
        opts.token,
      );
      return ProjectsResponseSchema.parse(raw).projects;
    },
  });
}

export function projectStatusCountsQueryOptions(opts: { token?: string }) {
  return queryOptions({
    queryKey: projectsKeys.statusCounts(),
    queryFn: async (): Promise<ProjectStatusCount[]> => {
      const raw = await gqlFetch<unknown>(
        PROJECT_STATUS_COUNTS_QUERY,
        undefined,
        opts.token,
      );
      return ProjectStatusCountsResponseSchema.parse(raw).projectStatusCounts;
    },
  });
}

export function projectByIdQueryOptions(opts: { id: string; token?: string }) {
  return queryOptions({
    queryKey: projectsKeys.detail(opts.id),
    queryFn: async (): Promise<Project> => {
      const raw = await gqlFetch<unknown>(
        PROJECT_QUERY,
        { id: opts.id },
        opts.token,
      );
      return ProjectByIdResponseSchema.parse(raw).project;
    },
  });
}
