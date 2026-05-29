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

  // One selection Set per section. The bulk-action bar reacts to
  // size > 0 in either set.
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(new Set());

  const [purgingProject, setPurgingProject] = useState<ProjectRowData | null>(null);
  const [purgingEquipment, setPurgingEquipment] = useState<EquipmentRowData | null>(null);
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);

  const restoreProjectMutation = useRestoreProject();
  const restoreEquipmentMutation = useRestoreEquipment();
  const purgeProjectMutation = usePurgeProject();
  const purgeEquipmentMutation = usePurgeEquipment();

  const toggleProjectId = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleEquipmentId = (id: string) => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const projects = projectsQ.data ?? [];
  const equipments = equipmentsQ.data ?? [];

  const allProjectsSelected = projects.length > 0 && projects.every((p) => selectedProjectIds.has(p.id));
  const allEquipmentsSelected = equipments.length > 0 && equipments.every((e) => selectedEquipmentIds.has(e.id));

  const toggleAllProjects = () => {
    setSelectedProjectIds(allProjectsSelected ? new Set() : new Set(projects.map((p) => p.id)));
  };
  const toggleAllEquipments = () => {
    setSelectedEquipmentIds(allEquipmentsSelected ? new Set() : new Set(equipments.map((e) => e.id)));
  };

  const totalSelected = selectedProjectIds.size + selectedEquipmentIds.size;
  const bulkBusy =
    restoreProjectMutation.isPending ||
    restoreEquipmentMutation.isPending ||
    purgeProjectMutation.isPending ||
    purgeEquipmentMutation.isPending;

  // Bulk Restore: loop single-id mutations. Same network cost as a real bulk
  // endpoint at this scale (~5-20 rows) and avoids backend duplication. Each
  // call still triggers its own cache invalidation; React batches the renders.
  const bulkRestore = async () => {
    await Promise.all([
      ...Array.from(selectedProjectIds).map((id) => restoreProjectMutation.mutateAsync(id).catch(() => null)),
      ...Array.from(selectedEquipmentIds).map((id) => restoreEquipmentMutation.mutateAsync(id).catch(() => null)),
    ]);
    setSelectedProjectIds(new Set());
    setSelectedEquipmentIds(new Set());
  };

  const bulkPurge = async () => {
    await Promise.all([
      ...Array.from(selectedProjectIds).map((id) => purgeProjectMutation.mutateAsync(id).catch(() => null)),
      ...Array.from(selectedEquipmentIds).map((id) => purgeEquipmentMutation.mutateAsync(id).catch(() => null)),
    ]);
    setSelectedProjectIds(new Set());
    setSelectedEquipmentIds(new Set());
    setBulkPurgeOpen(false);
  };

  return (
    <div className="space-y-6">
      <Section
        title="Deleted projects"
        isLoading={projectsQ.isLoading}
        isError={projectsQ.isError}
        error={projectsQ.error}
        items={projects}
        emptyCopy="No deleted projects."
        allSelected={allProjectsSelected}
        onToggleAll={toggleAllProjects}
        renderRow={(row) => (
          <ProjectRow
            key={row.id}
            row={row}
            selected={selectedProjectIds.has(row.id)}
            onToggle={() => toggleProjectId(row.id)}
            onPurgeClick={() => setPurgingProject(row)}
          />
        )}
      />
      <Section
        title="Deleted equipment"
        isLoading={equipmentsQ.isLoading}
        isError={equipmentsQ.isError}
        error={equipmentsQ.error}
        items={equipments}
        emptyCopy="No deleted equipment."
        allSelected={allEquipmentsSelected}
        onToggleAll={toggleAllEquipments}
        renderRow={(row) => (
          <EquipmentRow
            key={row.id}
            row={row}
            selected={selectedEquipmentIds.has(row.id)}
            onToggle={() => toggleEquipmentId(row.id)}
            onPurgeClick={() => setPurgingEquipment(row)}
          />
        )}
      />

      {/* Contextual bulk action bar — appears only when something is selected.
          Fixed to the viewport bottom so it stays accessible while the user
          scans rows in both sections. */}
      {totalSelected > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white shadow-xl rounded-xl px-5 py-3 flex items-center gap-4 z-40">
          <span className="text-sm">
            {totalSelected} selected
          </span>
          <button
            onClick={bulkRestore}
            disabled={bulkBusy}
            className="text-sm px-3 py-1.5 rounded-lg bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          >
            {bulkBusy ? 'Working…' : `Restore ${totalSelected}`}
          </button>
          <button
            onClick={() => setBulkPurgeOpen(true)}
            disabled={bulkBusy}
            className="text-sm px-3 py-1.5 rounded-lg text-red-300 hover:bg-red-950/40 disabled:opacity-50"
          >
            Purge {totalSelected}
          </button>
          <button
            onClick={() => {
              setSelectedProjectIds(new Set());
              setSelectedEquipmentIds(new Set());
            }}
            className="text-sm text-gray-400 hover:text-gray-200 ml-1"
          >
            Clear
          </button>
        </div>
      )}

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

      <ConfirmDeleteModal
        open={bulkPurgeOpen}
        title={`Permanently delete ${totalSelected} selected?`}
        description={
          <>
            {selectedProjectIds.size > 0 && (
              <span>
                {selectedProjectIds.size} project{selectedProjectIds.size === 1 ? '' : 's'} (and their materials)
              </span>
            )}
            {selectedProjectIds.size > 0 && selectedEquipmentIds.size > 0 && <> and </>}
            {selectedEquipmentIds.size > 0 && (
              <span>
                {selectedEquipmentIds.size} equipment item{selectedEquipmentIds.size === 1 ? '' : 's'}
              </span>
            )}
            {' '}will be permanently deleted. This cannot be undone.
          </>
        }
        confirmLabel={`Permanently delete ${totalSelected}`}
        isDeleting={bulkBusy}
        error={null}
        onCancel={() => setBulkPurgeOpen(false)}
        onConfirm={bulkPurge}
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
  allSelected,
  onToggleAll,
  renderRow,
}: {
  title: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  items: T[];
  emptyCopy: string;
  allSelected: boolean;
  onToggleAll: () => void;
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-900">
          {title} {!isLoading && items.length > 0 && (
            <span className="text-gray-400 font-normal">({items.length})</span>
          )}
        </h2>
        {!isLoading && items.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className="rounded"
            />
            Select all
          </label>
        )}
      </div>
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
  selected,
  onToggle,
  onPurgeClick,
}: {
  row: ProjectRowData;
  selected: boolean;
  onToggle: () => void;
  onPurgeClick: () => void;
}) {
  const mutation = useRestoreProject();
  const when = row.deletedAt ?? row.updatedAt;
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <label className="flex items-center gap-3 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded"
        />
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {row.status.replace('_', ' ')}
            {row.manager?.name && <> · 👤 {row.manager.name}</>}
            {' · deleted '}
            {new Date(when).toLocaleDateString()}
          </p>
        </div>
      </label>
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
  selected,
  onToggle,
  onPurgeClick,
}: {
  row: EquipmentRowData;
  selected: boolean;
  onToggle: () => void;
  onPurgeClick: () => void;
}) {
  const mutation = useRestoreEquipment();
  const when = row.deletedAt ?? row.updatedAt;
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <label className="flex items-center gap-3 cursor-pointer flex-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded"
        />
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {row.manager?.name && <>👤 {row.manager.name} · </>}
            deleted {new Date(when).toLocaleDateString()}
          </p>
        </div>
      </label>
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
