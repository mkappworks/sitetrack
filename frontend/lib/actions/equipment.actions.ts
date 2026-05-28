'use server';

import { revalidatePath } from 'next/cache';
import { gqlClient } from '../graphql/client';
import { CREATE_EQUIPMENT_MUTATION } from '../graphql/queries';
import {
  CreateEquipmentSchema,
  type CreateEquipmentFormInput,
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
