'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import {
  deletedProjectsQueryOptions,
  deletedEquipmentsQueryOptions,
} from '../../../lib/queries/trash';
import {
  useRestoreProject,
  useRestoreEquipment,
  usePurgeProject,
  usePurgeEquipment,
} from '../../../lib/mutations/trash';
import { ConfirmDeleteModal } from '../../../components/ConfirmDeleteModal';

type ProjectRowData = {
  id: string;
  name: string;
  status: string;
  deletedAt?: string | null;
  updatedAt: string;
  manager?: { name: string } | null;
};

type EquipmentRowData = {
  id: string;
  name: string;
  description?: string | null;
  deletedAt?: string | null;
  updatedAt: string;
  manager?: { name: string } | null;
};

export function TrashClient() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const projectsQ = useQuery(deletedProjectsQueryOptions({ token }));
  const equipmentsQ = useQuery(deletedEquipmentsQueryOptions({ token }));

  // Lifted modal state so the modal lives once at this level. Only one
  // purge confirm is open at a time across both sections.
  const [purgingProject, setPurgingProject] = useState<ProjectRowData | null>(null);
  const [purgingEquipment, setPurgingEquipment] = useState<EquipmentRowData | null>(null);
  const purgeProjectMutation = usePurgeProject();
  const purgeEquipmentMutation = usePurgeEquipment();

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
          <ProjectRow
            key={row.id}
            row={row}
            onPurgeClick={() => setPurgingProject(row)}
          />
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
          <EquipmentRow
            key={row.id}
            row={row}
            onPurgeClick={() => setPurgingEquipment(row)}
          />
        )}
      />

      <ConfirmDeleteModal
        open={!!purgingProject}
        title="Permanently delete project?"
        description={
          purgingProject && (
            <>
              <strong className="text-gray-900">{purgingProject.name}</strong>
              {' '}and all of its materials will be permanently deleted from
              the database. This cannot be undone — even Restore won't bring
              it back.
            </>
          )
        }
        confirmLabel="Permanently delete"
        isDeleting={purgeProjectMutation.isPending}
        error={purgeProjectMutation.isError ? purgeProjectMutation.error.message : null}
        onCancel={() => {
          setPurgingProject(null);
          purgeProjectMutation.reset();
        }}
        onConfirm={async () => {
          if (!purgingProject) return;
          await purgeProjectMutation.mutateAsync(purgingProject.id);
          setPurgingProject(null);
        }}
      />

      <ConfirmDeleteModal
        open={!!purgingEquipment}
        title="Permanently delete equipment?"
        description={
          purgingEquipment && (
            <>
              <strong className="text-gray-900">{purgingEquipment.name}</strong>
              {' '}will be permanently deleted from the database. This cannot
              be undone.
            </>
          )
        }
        confirmLabel="Permanently delete"
        isDeleting={purgeEquipmentMutation.isPending}
        error={purgeEquipmentMutation.isError ? purgeEquipmentMutation.error.message : null}
        onCancel={() => {
          setPurgingEquipment(null);
          purgeEquipmentMutation.reset();
        }}
        onConfirm={async () => {
          if (!purgingEquipment) return;
          await purgeEquipmentMutation.mutateAsync(purgingEquipment.id);
          setPurgingEquipment(null);
        }}
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
  onPurgeClick,
}: {
  row: ProjectRowData;
  onPurgeClick: () => void;
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
        <button
          onClick={onPurgeClick}
          className="text-xs text-red-600 hover:text-red-700"
        >
          Purge
        </button>
      </div>
    </li>
  );
}

function EquipmentRow({
  row,
  onPurgeClick,
}: {
  row: EquipmentRowData;
  onPurgeClick: () => void;
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
        <button
          onClick={onPurgeClick}
          className="text-xs text-red-600 hover:text-red-700"
        >
          Purge
        </button>
      </div>
    </li>
  );
}
