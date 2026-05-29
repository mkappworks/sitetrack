import { queryOptions } from '@tanstack/react-query';
import { gqlFetch } from '../graphql/client';
import { AUDIT_LOG_QUERY } from '../graphql/queries';
import { AuditLogResponseSchema } from '../graphql/schemas';

export const auditKeys = {
  all: ['audit'] as const,
  list: (limit: number, offset: number) =>
    [...auditKeys.all, 'list', { limit, offset }] as const,
};

export function auditLogQueryOptions(opts: {
  limit: number;
  offset: number;
  token?: string;
}) {
  return queryOptions({
    queryKey: auditKeys.list(opts.limit, opts.offset),
    queryFn: async () => {
      const raw = await gqlFetch<unknown>(
        AUDIT_LOG_QUERY,
        { limit: opts.limit, offset: opts.offset },
        opts.token,
      );
      return AuditLogResponseSchema.parse(raw).auditLog;
    },
  });
}
