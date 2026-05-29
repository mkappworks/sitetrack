'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { auditLogQueryOptions } from '../../../lib/queries/audit';
import type { AuditLogEntry } from '../../../lib/graphql/schemas';

// Colour-code by severity/kind. Purges + reuse-detection are the loudest.
const actionStyle: Record<string, string> = {
  PROJECT_PURGED: 'bg-red-100 text-red-800',
  EQUIPMENT_PURGED: 'bg-red-100 text-red-800',
  REFRESH_REUSE_DETECTED: 'bg-red-100 text-red-800',
  PROJECT_SOFT_DELETED: 'bg-amber-100 text-amber-800',
  EQUIPMENT_SOFT_DELETED: 'bg-amber-100 text-amber-800',
  MATERIAL_DELETED: 'bg-amber-100 text-amber-800',
  PROJECT_RESTORED: 'bg-green-100 text-green-800',
  EQUIPMENT_RESTORED: 'bg-green-100 text-green-800',
  USER_LOGIN: 'bg-gray-100 text-gray-600',
  USER_LOGOUT: 'bg-gray-100 text-gray-600',
};

function formatAction(action: string): string {
  return action.toLowerCase().replace(/_/g, ' ');
}

interface Props {
  page: number;
  pageSize: number;
}

export function AuditLogClient({ page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const offset = (page - 1) * pageSize;

  const { data, isLoading, isError, error } = useQuery(
    auditLogQueryOptions({ limit: pageSize, offset, token: session?.accessToken }),
  );

  const items = data?.items;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goToPage = (next: number) => {
    const params = new URLSearchParams();
    if (next > 1) params.set('page', String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="card">
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load audit log: {error.message}</p>
      ) : items && items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Action</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Target</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">Actor</th>
                <th className="text-left py-3 pr-4 font-medium text-gray-500">IP</th>
                <th className="text-left py-3 font-medium text-gray-500">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items!.map((entry: AuditLogEntry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-1 rounded-md ${actionStyle[entry.action] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {formatAction(entry.action)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {entry.targetLabel ? (
                      <>
                        {entry.targetLabel}
                        {entry.targetType && (
                          <span className="text-gray-400"> · {entry.targetType}</span>
                        )}
                      </>
                    ) : entry.targetType ? (
                      <span className="text-gray-400">{entry.targetType}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {entry.actorEmail ?? entry.actorId ?? <span className="text-gray-300">system</span>}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{entry.ipAddress ?? '—'}</td>
                  <td className="py-3 text-gray-400 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString()}
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
          disabled={page <= 1}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <span className="text-gray-500">Page {page} of {totalPages}</span>
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}
