'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsKeys } from '../queries/projects';
import { useOptimisticDetailMutation } from './optimistic';
import {
  createProject,
  createProjectWithMaterials,
  updateProject,
  updateProjectStatus,
  removeProject,
  addMaterial,
  updateMaterialStatus,
  updateMaterialQuantity,
  removeMaterial,
} from '../actions/project.actions';
import type {
  CreateProjectFormInput,
  CreateProjectWithMaterialsInput,
  UpdateProjectFormInput,
  UpdateProjectStatusInput,
  AddMaterialWithProjectInput,
  UpdateMaterialStatusInput,
  UpdateMaterialQuantityWithIdInput,
} from '../validation/forms';
import type { Project, Material } from '../graphql/schemas';

async function unwrap<T>(p: Promise<{ ok: true; data: T } | { ok: false; error: string }>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectFormInput) => unwrap(createProject(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useCreateProjectWithMaterials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectWithMaterialsInput) =>
      unwrap(createProjectWithMaterials(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectFormInput) => unwrap(updateProject(input)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: [...projectsKeys.all, 'list'] });
    },
  });
}

export function useRemoveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(removeProject(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

// Patches the project's own `status`; also invalidates list views (which
// show status) on settle. detailKey derives from input.id.
export function useUpdateProjectStatus() {
  return useOptimisticDetailMutation<UpdateProjectStatusInput, { id: string; status: string }, Project>({
    mutationFn: (input) => unwrap(updateProjectStatus(input)),
    detailKey: (input) => projectsKeys.detail(input.id),
    patch: (old, input) => ({ ...old, status: input.status }),
    extraInvalidateKeys: () => [[...projectsKeys.all, 'list']],
  });
}

// The four material mutations all patch the project detail's `materials`
// array and close over a fixed projectId for the detail key.
export function useAddMaterial(opts: { projectId: string }) {
  return useOptimisticDetailMutation<AddMaterialWithProjectInput, unknown, Project>({
    mutationFn: (input) => unwrap(addMaterial(input)),
    detailKey: () => projectsKeys.detail(opts.projectId),
    patch: (old, input) => {
      const optimisticMaterial: Material = {
        id: `temp-${Date.now()}`,
        name: input.name,
        quantity: input.quantity,
        unit: input.unit,
        status: 'ORDERED',
      };
      return { ...old, materials: [...(old.materials ?? []), optimisticMaterial] };
    },
  });
}

export function useUpdateMaterialStatus(opts: { projectId: string }) {
  return useOptimisticDetailMutation<UpdateMaterialStatusInput, unknown, Project>({
    mutationFn: (input) => unwrap(updateMaterialStatus(input)),
    detailKey: () => projectsKeys.detail(opts.projectId),
    patch: (old, input) => ({
      ...old,
      materials: old.materials?.map((m) =>
        m.id === input.id ? { ...m, status: input.status } : m,
      ),
    }),
  });
}

export function useRemoveMaterial(opts: { projectId: string }) {
  return useOptimisticDetailMutation<string, unknown, Project>({
    mutationFn: (id) => unwrap(removeMaterial(id)),
    detailKey: () => projectsKeys.detail(opts.projectId),
    patch: (old, id) => ({
      ...old,
      materials: old.materials?.filter((m) => m.id !== id),
    }),
  });
}

export function useUpdateMaterialQuantity(opts: { projectId: string }) {
  return useOptimisticDetailMutation<UpdateMaterialQuantityWithIdInput, unknown, Project>({
    mutationFn: (input) => unwrap(updateMaterialQuantity(input)),
    detailKey: () => projectsKeys.detail(opts.projectId),
    patch: (old, input) => ({
      ...old,
      materials: old.materials?.map((m) =>
        m.id === input.id ? { ...m, quantity: input.quantity } : m,
      ),
    }),
  });
}
