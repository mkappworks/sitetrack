import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import { USERS_QUERY } from '../graphql/queries';
import { UsersResponseSchema, type UsersResponse } from '../graphql/schemas';

export const usersKeys = {
  all: ['users'] as const,
  list: (limit: number, offset: number) =>
    [...usersKeys.all, 'list', { limit, offset }] as const,
};

export function usersQueryOptions(opts: {
  limit: number;
  offset: number;
  token?: string;
}) {
  return queryOptions({
    queryKey: usersKeys.list(opts.limit, opts.offset),
    queryFn: async (): Promise<UsersResponse['users']> => {
      const raw = await gqlFetch<unknown>(
        USERS_QUERY,
        { limit: opts.limit, offset: opts.offset },
        opts.token,
      );
      const parsed = UsersResponseSchema.parse(raw);
      return parsed.users;
    },
  });
}
