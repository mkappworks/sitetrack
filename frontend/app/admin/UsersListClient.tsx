'use client';

import { useEffect, useState } from 'react';
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
  search: string | undefined;
}

const SEARCH_DEBOUNCE_MS = 300;

export function UsersListClient({ page, pageSize, search }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const offset = (page - 1) * pageSize;

  const [draft, setDraft] = useState(search ?? '');

  useEffect(() => {
    setDraft(search ?? '');
  }, [search]);

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === (search ?? '')) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (trimmed) params.set('q', trimmed);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, search, pathname, router]);

  const { data, isLoading, isError, error } = useQuery(
    usersQueryOptions({
      limit: pageSize,
      offset,
      search,
      token: session?.accessToken,
    }),
  );

  const users = data?.items;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const goToPage = (next: number) => {
    const params = new URLSearchParams();
    if (next > 1) params.set('page', String(next));
    if (search) params.set('q', search);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4 mb-4">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search name or email…"
          className="input max-w-sm"
          aria-label="Search users"
        />
        <h2 className="text-sm text-gray-500 whitespace-nowrap">
          {total} {total === 1 ? 'user' : 'users'}
          {search && (
            <>
              {' '}matching “{search}”
            </>
          )}
        </h2>
      </div>

      {isLoading ? (
        <UsersTableSkeleton rows={5} />
      ) : isError ? (
        <p className="text-red-500 text-sm">Failed to load users: {error.message}</p>
      ) : users && users.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          {search ? 'No users match this search.' : 'No users yet.'}
        </p>
      ) : (
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
              {users!.map((user) => (
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
      )}

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

// Table-shaped skeleton mirrors the post-load layout so the loading-state
// to loaded-state transition feels continuous rather than discontinuous.
function UsersTableSkeleton({ rows }: { rows: number }) {
  return (
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
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="py-3 pr-4"><span className="block h-4 w-32 rounded bg-gray-100 animate-pulse" /></td>
              <td className="py-3 pr-4"><span className="block h-4 w-48 rounded bg-gray-100 animate-pulse" /></td>
              <td className="py-3 pr-4"><span className="block h-5 w-16 rounded-md bg-gray-100 animate-pulse" /></td>
              <td className="py-3"><span className="block h-4 w-24 rounded bg-gray-100 animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
