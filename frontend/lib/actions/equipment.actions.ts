'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { gqlClient } from '../graphql/client';
import {
  CREATE_EQUIPMENT_MUTATION,
  UPDATE_EQUIPMENT_MUTATION,
  REMOVE_EQUIPMENT_MUTATION,
} from '../graphql/queries';
import {
  CreateEquipmentSchema,
  UpdateEquipmentSchema,
  type CreateEquipmentFormInput,
  type UpdateEquipmentInput,
} from '../validation/forms';
import type { ActionResult } from './project.actions';

export async function createEquipment(
  input: CreateEquipmentFormInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const wireInput = {
    ...parsed.data,
    description: parsed.data.description || undefined,
  };

  const client = await gqlClient();
  try {
    const data = await client.request<{ createEquipment: { id: string } }>(
      CREATE_EQUIPMENT_MUTATION,
      { input: wireInput },
    );
    revalidatePath('/equipments');
    return { ok: true, data: { id: data.createEquipment.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create equipment' };
  }
}

export async function updateEquipment(
  input: UpdateEquipmentInput,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = UpdateEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const { id, ...fields } = parsed.data;
  const wireInput = {
    name: fields.name,
    description: fields.description || undefined,
  };

  const client = await gqlClient();
  try {
    const data = await client.request<{ updateEquipment: { id: string; name: string } }>(
      UPDATE_EQUIPMENT_MUTATION,
      { id, input: wireInput },
    );
    revalidatePath('/equipments');
    revalidatePath(`/equipments/${id}`);
    return { ok: true, data: data.updateEquipment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update equipment' };
  }
}

const IdSchema = z.object({ id: z.uuid('Invalid id') });

export async function removeEquipment(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: 'Invalid equipment id' };

  const client = await gqlClient();
  try {
    await client.request<{ removeEquipment: boolean }>(REMOVE_EQUIPMENT_MUTATION, {
      id: parsed.data.id,
    });
    revalidatePath('/equipments');
    return { ok: true, data: { id: parsed.data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete equipment' };
  }
}
