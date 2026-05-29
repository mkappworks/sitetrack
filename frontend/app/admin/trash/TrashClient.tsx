'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
  deletedProjectsQueryOptions,
  deletedEquipmentsQueryOptions,
} from '../../../lib/queries/trash';
import {
  useRestoreProject,
  useRestoreEquipment,
} from '../../../lib/mutations/trash';

export function TrashClient() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const projectsQ = useQuery(deletedProjectsQueryOptions({ token }));
  const equipmentsQ = useQuery(deletedEquipmentsQueryOptions({ token }));

  return (
    <div className="space-y-6">
      <Section
        title="Deleted projects"
        isLoading={projectsQ.isLoading}
        isError={projectsQ.isError}
        error={projectsQ.error}
        items={projectsQ.data ?? []}
        emptyCopy="No deleted projects."
        renderRow={(row) => (
          <ProjectRow key={row.id} row={row} />
        )}
      />
      <Section
        title="Deleted equipment"
        isLoading={equipmentsQ.isLoading}
        isError={equipmentsQ.isError}
        error={equipmentsQ.error}
        items={equipmentsQ.data ?? []}
        emptyCopy="No deleted equipment."
        renderRow={(row) => (
          <EquipmentRow key={row.id} row={row} />
        )}
      />
    </div>
  );
}

function Section<T>({
  title,
  isLoading,
  isError,
  error,
  items,
  emptyCopy,
  renderRow,
}: {
  title: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  items: T[];
  emptyCopy: string;
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <section className="card">
      <h2 className="text-base font-medium text-gray-900 mb-4">
        {title} {!isLoading && items.length > 0 && (
          <span className="text-gray-400 font-normal">({items.length})</span>
        )}
      </h2>
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load: {error?.message}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyCopy}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map(renderRow)}
        </ul>
      )}
    </section>
  );
}

function ProjectRow({
  row,
}: {
  row: {
    id: string;
    name: string;
    status: string;
    deletedAt?: string | null;
    updatedAt: string;
    manager?: { name: string } | null;
  };
}) {
  const mutation = useRestoreProject();
  const when = row.deletedAt ?? row.updatedAt;
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {row.status.replace('_', ' ')}
          {row.manager?.name && <> · 👤 {row.manager.name}</>}
          {' · deleted '}
          {new Date(when).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {mutation.isError && (
          <span className="text-xs text-red-600">{mutation.error.message}</span>
        )}
        <button
          onClick={() => mutation.mutate(row.id)}
          disabled={mutation.isPending}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          {mutation.isPending ? 'Restoring…' : 'Restore'}
        </button>
      </div>
    </li>
  );
}

function EquipmentRow({
  row,
}: {
  row: {
    id: string;
    name: string;
    description?: string | null;
    deletedAt?: string | null;
    updatedAt: string;
    manager?: { name: string } | null;
  };
}) {
  const mutation = useRestoreEquipment();
  const when = row.deletedAt ?? row.updatedAt;
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {row.manager?.name && <>👤 {row.manager.name} · </>}
          deleted {new Date(when).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {mutation.isError && (
          <span className="text-xs text-red-600">{mutation.error.message}</span>
        )}
        <button
          onClick={() => mutation.mutate(row.id)}
          disabled={mutation.isPending}
          className="btn-secondary text-xs disabled:opacity-40"
        >
          {mutation.isPending ? 'Restoring…' : 'Restore'}
        </button>
      </div>
    </li>
  );
}
