'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentsKeys } from '../queries/equipments';
import { createEquipment } from '../actions/equipment.actions';
import type { CreateEquipmentFormInput } from '../validation/forms';

async function unwrap<T>(
  p: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEquipmentFormInput) => unwrap(createEquipment(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentsKeys.all });
    },
  });
}
