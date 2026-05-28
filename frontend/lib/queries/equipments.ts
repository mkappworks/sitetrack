import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import { EQUIPMENTS_QUERY, EQUIPMENT_QUERY } from '../graphql/queries';
import {
  EquipmentsResponseSchema,
  EquipmentByIdResponseSchema,
  type EquipmentsResponse,
  type Equipment,
} from '../graphql/schemas';

export const equipmentsKeys = {
  all: ['equipments'] as const,
  list: (limit: number, offset: number) =>
    [...equipmentsKeys.all, 'list', { limit, offset }] as const,
  detail: (id: string) => [...equipmentsKeys.all, 'detail', id] as const,
};

export function equipmentsQueryOptions(opts: {
  limit: number;
  offset: number;
  token?: string;
}) {
  return queryOptions({
    queryKey: equipmentsKeys.list(opts.limit, opts.offset),
    queryFn: async (): Promise<EquipmentsResponse['equipments']> => {
      const raw = await gqlFetch<unknown>(
        EQUIPMENTS_QUERY,
        { limit: opts.limit, offset: opts.offset },
        opts.token,
      );
      return EquipmentsResponseSchema.parse(raw).equipments;
    },
  });
}

export function equipmentByIdQueryOptions(opts: { id: string; token?: string }) {
  return queryOptions({
    queryKey: equipmentsKeys.detail(opts.id),
    queryFn: async (): Promise<Equipment> => {
      const raw = await gqlFetch<unknown>(
        EQUIPMENT_QUERY,
        { id: opts.id },
        opts.token,
      );
      return EquipmentByIdResponseSchema.parse(raw).equipment;
    },
  });
}
