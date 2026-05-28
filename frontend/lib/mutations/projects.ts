'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsKeys } from '../queries/projects';
import {
  createProject,
  createProjectWithMaterials,
  updateProjectStatus,
  removeProject,
  addMaterial,
  updateMaterialStatus,
  updateMaterialQuantity,
} from '../actions/project.actions';
import type {
  CreateProjectFormInput,
  CreateProjectWithMaterialsInput,
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

export function useRemoveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(removeProject(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectStatusInput) => unwrap(updateProjectStatus(input)),
    onMutate: async (input) => {
      const detailKey = projectsKeys.detail(input.id);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prevDetail = queryClient.getQueryData<Project>(detailKey);
      queryClient.setQueryData<Project>(detailKey, (old) =>
        old ? { ...old, status: input.status } : old,
      );
      return { prevDetail, detailKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevDetail) queryClient.setQueryData(ctx.detailKey, ctx.prevDetail);
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.detail(vars.id) });
      queryClient.invalidateQueries({ queryKey: [...projectsKeys.all, 'list'] });
    },
  });
}

export function useAddMaterial(opts: { projectId: string }) {
  const queryClient = useQueryClient();
  const detailKey = projectsKeys.detail(opts.projectId);
  return useMutation({
    mutationFn: (input: AddMaterialWithProjectInput) => unwrap(addMaterial(input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prev = queryClient.getQueryData<Project>(detailKey);
      const optimisticMaterial: Material = {
        id: `temp-${Date.now()}`,
        name: input.name,
        quantity: input.quantity,
        unit: input.unit,
        status: 'ORDERED',
      };
      queryClient.setQueryData<Project>(detailKey, (old) =>
        old ? { ...old, materials: [...(old.materials ?? []), optimisticMaterial] } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(detailKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });
}

export function useUpdateMaterialStatus(opts: { projectId: string }) {
  const queryClient = useQueryClient();
  const detailKey = projectsKeys.detail(opts.projectId);
  return useMutation({
    mutationFn: (input: UpdateMaterialStatusInput) => unwrap(updateMaterialStatus(input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prev = queryClient.getQueryData<Project>(detailKey);
      queryClient.setQueryData<Project>(detailKey, (old) =>
        old ? {
          ...old,
          materials: old.materials?.map((m) =>
            m.id === input.id ? { ...m, status: input.status } : m,
          ),
        } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(detailKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });
}

export function useUpdateMaterialQuantity(opts: { projectId: string }) {
  const queryClient = useQueryClient();
  const detailKey = projectsKeys.detail(opts.projectId);
  return useMutation({
    mutationFn: (input: UpdateMaterialQuantityWithIdInput) => unwrap(updateMaterialQuantity(input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prev = queryClient.getQueryData<Project>(detailKey);
      queryClient.setQueryData<Project>(detailKey, (old) =>
        old ? {
          ...old,
          materials: old.materials?.map((m) =>
            m.id === input.id ? { ...m, quantity: input.quantity } : m,
          ),
        } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(detailKey, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });
}
