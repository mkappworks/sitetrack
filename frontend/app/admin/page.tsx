import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { requireAuthedSession } from '../../lib/require-session';
import { getQueryClient } from '../../lib/get-query-client';
import { usersQueryOptions } from '../../lib/queries/users';
import { UsersListClient } from './UsersListClient';

const PAGE_SIZE = 20;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await requireAuthedSession();
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const search = q?.trim() || undefined;

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    usersQueryOptions({
      limit: PAGE_SIZE,
      offset,
      search,
      token: session.accessToken,
    }),
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage users and system settings
          </p>
        </div>
        <Link href="/admin/user" className="btn-primary">
          + New user
        </Link>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <UsersListClient page={page} pageSize={PAGE_SIZE} search={search} />
      </HydrationBoundary>
    </div>
  );
}
