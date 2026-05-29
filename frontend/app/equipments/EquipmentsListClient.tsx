'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { EquipmentCard } from '../../components/EquipmentCard';
import { CardGridSkeleton } from '../../components/CardGridSkeleton';
import { equipmentsQueryOptions } from '../../lib/queries/equipments';

interface Props {
  page: number;
  pageSize: number;
  search: string | undefined;
}

const SEARCH_DEBOUNCE_MS = 300;

export function EquipmentsListClient({ page, pageSize, search }: Props) {
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
    equipmentsQueryOptions({
      limit: pageSize,
      offset,
      search,
      token: session?.accessToken,
    }),
  );

  const equipments = data?.items;
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
    <>
      <div className="-mt-6 mb-6 flex items-center justify-between gap-4">
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search by name…"
          className="input max-w-sm"
          aria-label="Search equipment"
        />
        <p className="text-sm text-gray-500 whitespace-nowrap">
          {total} {total === 1 ? 'item' : 'items'}
          {search && (
            <>
              {' '}matching “{search}”
            </>
          )}
        </p>
      </div>

      {isLoading ? (
        <CardGridSkeleton />
      ) : isError ? (
        <div className="text-center py-16 text-red-500">
          <p className="text-sm">Failed to load equipment: {error.message}</p>
        </div>
      ) : equipments && equipments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? (
            <>
              <p className="text-lg font-medium">No matches</p>
              <p className="text-sm mt-1">Try a different search.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No equipment yet</p>
              <p className="text-sm mt-1">Add your first item to get started</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {equipments!.map((equipment) => (
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
