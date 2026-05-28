'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentsKeys } from '../queries/equipments';
import {
  createEquipment,
  updateEquipment,
  removeEquipment,
} from '../actions/equipment.actions';
import type {
  CreateEquipmentFormInput,
  UpdateEquipmentInput,
} from '../validation/forms';

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

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEquipmentInput) => unwrap(updateEquipment(input)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentsKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: equipmentsKeys.all });
    },
  });
}

export function useRemoveEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(removeEquipment(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentsKeys.all });
    },
  });
}
