'use server';

import { revalidatePath } from 'next/cache';
import { gqlClient } from '../graphql/client';
import {
  CREATE_PROJECT_MUTATION,
  CREATE_PROJECT_WITH_MATERIALS_MUTATION,
  UPDATE_PROJECT_MUTATION,
  REMOVE_PROJECT_MUTATION,
  CREATE_MATERIAL_MUTATION,
  UPDATE_MATERIAL_MUTATION,
} from '../graphql/queries';
import { z } from 'zod';
import {
  CreateProjectSchema,
  CreateProjectWithMaterialsSchema,
  UpdateProjectStatusSchema,
  AddMaterialWithProjectSchema,
  UpdateMaterialStatusSchema,
  UpdateMaterialQuantityWithIdSchema,
  type CreateProjectFormInput,
  type CreateProjectWithMaterialsInput,
  type UpdateProjectStatusInput,
  type AddMaterialWithProjectInput,
  type UpdateMaterialStatusInput,
  type UpdateMaterialQuantityWithIdInput,
} from '../validation/forms';

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function parseInput<T>(
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } },
  input: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error!.issues.map((i) => i.message).join('; '),
    };
  }
  return { ok: true, data: parsed.data as T };
}

export async function createProject(
  input: CreateProjectFormInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseInput(CreateProjectSchema, input);
  if (!parsed.ok) return parsed;

  const wireInput = {
    ...parsed.data,
    description: parsed.data.description || undefined,
    location: parsed.data.location || undefined,
  };

  const client = await gqlClient();
  try {
    const data = await client.request<{ createProject: { id: string } }>(
      CREATE_PROJECT_MUTATION,
      { input: wireInput },
    );
    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { ok: true, data: { id: data.createProject.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create project' };
  }
}

export async function createProjectWithMaterials(
  input: CreateProjectWithMaterialsInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseInput(CreateProjectWithMaterialsSchema, input);
  if (!parsed.ok) return parsed;

  const wireInput = {
    ...parsed.data,
    description: parsed.data.description || undefined,
    location: parsed.data.location || undefined,
  };

  const client = await gqlClient();
  try {
    const data = await client.request<{ createProjectWithMaterials: { id: string } }>(
      CREATE_PROJECT_WITH_MATERIALS_MUTATION,
      { input: wireInput },
    );
    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { ok: true, data: { id: data.createProjectWithMaterials.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create project' };
  }
}

export async function updateProjectStatus(
  input: UpdateProjectStatusInput,
): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = parseInput(UpdateProjectStatusSchema, input);
  if (!parsed.ok) return parsed;

  const client = await gqlClient();
  try {
    const data = await client.request<{ updateProject: { id: string; status: string } }>(
      UPDATE_PROJECT_MUTATION,
      { id: parsed.data.id, input: { status: parsed.data.status } },
    );
    revalidatePath('/dashboard');
    revalidatePath(`/projects/${parsed.data.id}`);
    return { ok: true, data: data.updateProject };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update status' };
  }
}

export async function addMaterial(
  input: AddMaterialWithProjectInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseInput(AddMaterialWithProjectSchema, input);
  if (!parsed.ok) return parsed;

  const client = await gqlClient();
  try {
    const data = await client.request<{ createMaterial: { id: string } }>(
      CREATE_MATERIAL_MUTATION,
      { input: parsed.data },
    );
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, data: { id: data.createMaterial.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to add material' };
  }
}

export async function updateMaterialStatus(
  input: UpdateMaterialStatusInput,
): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = parseInput(UpdateMaterialStatusSchema, input);
  if (!parsed.ok) return parsed;

  const client = await gqlClient();
  try {
    const data = await client.request<{ updateMaterial: { id: string; status: string } }>(
      UPDATE_MATERIAL_MUTATION,
      { id: parsed.data.id, input: { status: parsed.data.status } },
    );
    return { ok: true, data: data.updateMaterial };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update material' };
  }
}

const IdSchema = z.object({ id: z.uuid('Invalid id') });

export async function removeProject(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: 'Invalid project id' };

  const client = await gqlClient();
  try {
    await client.request<{ removeProject: boolean }>(REMOVE_PROJECT_MUTATION, {
      id: parsed.data.id,
    });
    revalidatePath('/dashboard');
    revalidatePath('/projects');
    return { ok: true, data: { id: parsed.data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete project' };
  }
}

export async function updateMaterialQuantity(
  input: UpdateMaterialQuantityWithIdInput,
): Promise<ActionResult<{ id: string; quantity: number }>> {
  const parsed = parseInput(UpdateMaterialQuantityWithIdSchema, input);
  if (!parsed.ok) return parsed;

  const client = await gqlClient();
  try {
    const data = await client.request<{ updateMaterial: { id: string; quantity: number } }>(
      UPDATE_MATERIAL_MUTATION,
      { id: parsed.data.id, input: { quantity: parsed.data.quantity } },
    );
    return { ok: true, data: data.updateMaterial };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update quantity' };
  }
}
