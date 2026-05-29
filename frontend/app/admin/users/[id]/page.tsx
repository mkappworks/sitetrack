import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuthedSession } from '../../../../lib/require-session';
import { gqlFetch } from '../../../../lib/graphql/client';
import { USER_BY_ID_QUERY } from '../../../../lib/graphql/queries';
import { UserByIdResponseSchema } from '../../../../lib/graphql/schemas';
import { UserSessionsClient } from './UserSessionsClient';

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuthedSession();
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const { id } = await params;

  let user;
  try {
    const raw = await gqlFetch<unknown>(USER_BY_ID_QUERY, { id }, session.accessToken);
    user = UserByIdResponseSchema.parse(raw).user;
  } catch (err) {
    // Only a genuine "no such user" is a 404. Auth/parse/network errors must
    // surface to the error boundary instead of masquerading as a missing page
    // (which is what hid the missing-createdAt schema mismatch here).
    const msg = err instanceof Error ? err.message : '';
    if (/not found/i.test(msg)) notFound();
    throw err;
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
        ← Back to users
      </Link>
      <div className="mt-3 mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{user.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.email} · {user.role}
        </p>
      </div>

      <UserSessionsClient userId={user.id} userName={user.name} />
    </div>
  );
}
