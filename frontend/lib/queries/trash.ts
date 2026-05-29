import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import {
  DELETED_PROJECTS_QUERY,
  DELETED_EQUIPMENTS_QUERY,
} from '../graphql/queries';
import {
  DeletedProjectsResponseSchema,
  DeletedEquipmentsResponseSchema,
  type Project,
  type Equipment,
} from '../graphql/schemas';

export const trashKeys = {
  all: ['trash'] as const,
  projects: () => [...trashKeys.all, 'projects'] as const,
  equipments: () => [...trashKeys.all, 'equipments'] as const,
};

export function deletedProjectsQueryOptions(opts: { token?: string }) {
  return queryOptions({
    queryKey: trashKeys.projects(),
    queryFn: async (): Promise<Project[]> => {
      const raw = await gqlFetch<unknown>(
        DELETED_PROJECTS_QUERY,
        undefined,
        opts.token,
      );
      return DeletedProjectsResponseSchema.parse(raw).deletedProjects;
    },
  });
}

export function deletedEquipmentsQueryOptions(opts: { token?: string }) {
  return queryOptions({
    queryKey: trashKeys.equipments(),
    queryFn: async (): Promise<Equipment[]> => {
      const raw = await gqlFetch<unknown>(
        DELETED_EQUIPMENTS_QUERY,
        undefined,
        opts.token,
      );
      return DeletedEquipmentsResponseSchema.parse(raw).deletedEquipments;
    },
  });
}
