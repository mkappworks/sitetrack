'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '../../lib/queries/users';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-700',
};

interface Props {
  page: number;
  pageSize: number;
}

export function UsersListClient({ page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const offset = (page - 1) * pageSize;

  const { data, isLoading, isError, error } = useQuery(
    usersQueryOptions({
      limit: pageSize,
      offset,
      token: session?.accessToken,
    }),
  );

  if (isLoading) {
    return (
      <div className="card text-gray-400 text-sm">Loading…</div>
    );
  }
  if (isError) {
    return (
      <div className="card text-red-500 text-sm">
        Failed to load users: {error.message}
      </div>
    );
  }

  const users = data!.items;
  const total = data!.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const goToPage = (next: number) => {
    const params = new URLSearchParams();
    if (next > 1) params.set('page', String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-900">
          Users ({total})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 pr-4 font-medium text-gray-500">Name</th>
              <th className="text-left py-3 pr-4 font-medium text-gray-500">Email</th>
              <th className="text-left py-3 pr-4 font-medium text-gray-500">Role</th>
              <th className="text-left py-3 font-medium text-gray-500">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4 font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="py-3 pr-4 text-gray-500">{user.email}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-block text-xs font-medium px-2 py-1 rounded-md ${roleColors[user.role] ?? 'bg-gray-100'}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-3 text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Pagination"
        className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm"
      >
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={!hasPrev}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <span className="text-gray-500">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={!hasNext}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
