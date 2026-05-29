import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '../../../../lib/auth';
import { gqlFetch } from '../../../../lib/graphql/client';
import { USER_BY_ID_QUERY } from '../../../../lib/graphql/queries';
import { UserByIdResponseSchema } from '../../../../lib/graphql/schemas';
import { UserSessionsClient } from './UserSessionsClient';

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') redirect('/dashboard');

  const { id } = await params;

  let user;
  try {
    const raw = await gqlFetch<unknown>(USER_BY_ID_QUERY, { id }, session.accessToken);
    user = UserByIdResponseSchema.parse(raw).user;
  } catch {
    notFound();
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
