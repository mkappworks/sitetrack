'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { gqlClient } from '../graphql/client';
import {
  RESTORE_PROJECT_MUTATION,
  RESTORE_EQUIPMENT_MUTATION,
} from '../graphql/queries';
import type { ActionResult } from './project.actions';

const IdSchema = z.object({ id: z.uuid('Invalid id') });

export async function restoreProject(id: string): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: 'Invalid project id' };

  const client = await gqlClient();
  try {
    const data = await client.request<{ restoreProject: { id: string; name: string } }>(
      RESTORE_PROJECT_MUTATION,
      { id: parsed.data.id },
    );
    // Trashed row reappears in the active lists; both caches need refresh.
    revalidatePath('/projects');
    revalidatePath('/dashboard');
    revalidatePath('/admin/trash');
    return { ok: true, data: data.restoreProject };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to restore project' };
  }
}

export async function restoreEquipment(id: string): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: 'Invalid equipment id' };

  const client = await gqlClient();
  try {
    const data = await client.request<{ restoreEquipment: { id: string; name: string } }>(
      RESTORE_EQUIPMENT_MUTATION,
      { id: parsed.data.id },
    );
    revalidatePath('/equipments');
    revalidatePath('/admin/trash');
    return { ok: true, data: data.restoreEquipment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to restore equipment' };
  }
}
