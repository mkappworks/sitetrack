import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { authOptions } from '../../../lib/auth';
import { getQueryClient } from '../../../lib/get-query-client';
import { auditLogQueryOptions } from '../../../lib/queries/audit';
import { AuditLogClient } from './AuditLogClient';

const PAGE_SIZE = 25;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') redirect('/dashboard');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    auditLogQueryOptions({ limit: PAGE_SIZE, offset, token: session.accessToken }),
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Audit log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Destructive actions and authentication events, newest first.
        </p>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <AuditLogClient page={page} pageSize={PAGE_SIZE} />
      </HydrationBoundary>
    </div>
  );
}
