'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentCard } from '../../components/EquipmentCard';
import { equipmentsQueryOptions } from '../../lib/queries/equipments';

interface Props {
  page: number;
  pageSize: number;
}

export function EquipmentsListClient({ page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const offset = (page - 1) * pageSize;

  const { data, isLoading, isError, error } = useQuery(
    equipmentsQueryOptions({
      limit: pageSize,
      offset,
      token: session?.accessToken,
    }),
  );

  if (isLoading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Loading…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 text-red-500">
        <p className="text-sm">Failed to load equipment: {error.message}</p>
      </div>
    );
  }

  const equipments = data!.items;
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
    <>
      <p className="text-sm text-gray-500 -mt-6 mb-6">
        {total} {total === 1 ? 'item' : 'items'}
      </p>

      {equipments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No equipment yet</p>
          <p className="text-sm mt-1">Add your first item to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {equipments.map((equipment) => (
              <EquipmentCard key={equipment.id} equipment={equipment} />
            ))}
          </div>

          <nav
            aria-label="Pagination"
            className="mt-8 flex items-center justify-between text-sm"
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
        </>
      )}
    </>
  );
}
