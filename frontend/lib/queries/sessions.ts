import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import { MY_SESSIONS_QUERY, USER_SESSIONS_QUERY } from '../graphql/queries';
import {
  MySessionsResponseSchema,
  UserSessionsResponseSchema,
  type Session,
} from '../graphql/schemas';

export const sessionsKeys = {
  all: ['sessions'] as const,
  mine: () => [...sessionsKeys.all, 'mine'] as const,
  forUser: (userId: string) => [...sessionsKeys.all, 'user', userId] as const,
};

export function mySessionsQueryOptions(opts: { token?: string }) {
  return queryOptions({
    queryKey: sessionsKeys.mine(),
    queryFn: async (): Promise<Session[]> => {
      const raw = await gqlFetch<unknown>(MY_SESSIONS_QUERY, undefined, opts.token);
      return MySessionsResponseSchema.parse(raw).mySessions;
    },
  });
}

export function userSessionsQueryOptions(opts: { userId: string; token?: string }) {
  return queryOptions({
    queryKey: sessionsKeys.forUser(opts.userId),
    queryFn: async (): Promise<Session[]> => {
      const raw = await gqlFetch<unknown>(
        USER_SESSIONS_QUERY,
        { userId: opts.userId },
        opts.token,
      );
      return UserSessionsResponseSchema.parse(raw).userSessions;
    },
  });
}
