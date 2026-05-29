import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import { USERS_QUERY, MANAGERS_QUERY } from '../graphql/queries';
import {
  UsersResponseSchema,
  ManagersResponseSchema,
  type UsersResponse,
  type Manager,
} from '../graphql/schemas';

export const usersKeys = {
  all: ['users'] as const,
  list: (limit: number, offset: number, search: string | undefined) =>
    [...usersKeys.all, 'list', { limit, offset, search: search || undefined }] as const,
  managers: () => [...usersKeys.all, 'managers'] as const,
};

export function managersQueryOptions(opts: { token?: string }) {
  return queryOptions({
    queryKey: usersKeys.managers(),
    queryFn: async (): Promise<Manager[]> => {
      const raw = await gqlFetch<unknown>(MANAGERS_QUERY, undefined, opts.token);
      return ManagersResponseSchema.parse(raw).managers;
    },
    // Manager list rarely changes mid-session; keep fresh for the whole session.
    staleTime: Infinity,
  });
}

export function usersQueryOptions(opts: {
  limit: number;
  offset: number;
  search?: string;
  token?: string;
}) {
  return queryOptions({
    queryKey: usersKeys.list(opts.limit, opts.offset, opts.search),
    queryFn: async (): Promise<UsersResponse['users']> => {
      const raw = await gqlFetch<unknown>(
        USERS_QUERY,
        { limit: opts.limit, offset: opts.offset, search: opts.search || null },
        opts.token,
      );
      const parsed = UsersResponseSchema.parse(raw);
      return parsed.users;
    },
  });
}
