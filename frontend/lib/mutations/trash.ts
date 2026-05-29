'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trashKeys } from '../queries/trash';
import { projectsKeys } from '../queries/projects';
import { equipmentsKeys } from '../queries/equipments';
import { restoreProject, restoreEquipment } from '../actions/trash.actions';

async function unwrap<T>(
  p: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(restoreProject(id)),
    onSuccess: () => {
      // Trashed row is no longer trashed → invalidate BOTH caches so the
      // active projects list shows it and the trash list drops it.
      queryClient.invalidateQueries({ queryKey: trashKeys.projects() });
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useRestoreEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(restoreEquipment(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.equipments() });
      queryClient.invalidateQueries({ queryKey: equipmentsKeys.all });
    },
  });
}
