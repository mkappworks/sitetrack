'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useUpdateMaterialQuantity } from '../lib/mutations/projects';
import { UpdateMaterialQuantitySchema } from '../lib/validation/forms';

const materialStatusColors: Record<string, string> = {
  ORDERED:    'bg-gray-100 text-gray-600',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  ON_SITE:    'bg-green-100 text-green-700',
  USED:       'bg-blue-100 text-blue-700',
  RETURNED:   'bg-purple-100 text-purple-700',
};

interface MaterialRow {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: string;
}

export function MaterialsTable({
  materials,
  canEdit,
  projectId,
}: {
  materials: MaterialRow[];
  canEdit: boolean;
  projectId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Material</th>
            <th className="text-right py-2 pr-4 font-medium text-gray-500">Quantity</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Status</th>
            {canEdit && <th className="text-right py-2 font-medium text-gray-500 w-24" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {materials.map((m) =>
            editingId === m.id ? (
              <EditableRow
                key={m.id}
                material={m}
                projectId={projectId}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-900">{m.name}</td>
                <td className="py-2.5 pr-4 text-right text-gray-500 tabular-nums">
                  {m.quantity} {m.unit}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${materialStatusColors[m.status] ?? ''}`}>
                    {m.status.replace('_', ' ')}
                  </span>
                </td>
                {canEdit && (
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => setEditingId(m.id)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Edit qty
                    </button>
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditableRow({
  material,
  projectId,
  onDone,
}: {
  material: MaterialRow;
  projectId: string;
  onDone: () => void;
}) {
  const mutation = useUpdateMaterialQuantity({ projectId });

  const form = useForm({
    defaultValues: { quantity: material.quantity },
    validators: { onChange: UpdateMaterialQuantitySchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ id: material.id, quantity: value.quantity });
      onDone();
    },
  });

  return (
    <tr className="bg-blue-50/40">
      <td className="py-2.5 pr-4 font-medium text-gray-900">{material.name}</td>
      <td className="py-2.5 pr-4 text-right">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="inline-flex items-center gap-2"
        >
          <form.Field name="quantity">
            {(field) => (
              <div className="flex flex-col items-end">
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  className="input w-24 text-right"
                  value={field.state.value || ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                <FieldError field={field} />
              </div>
            )}
          </form.Field>
          <span className="text-gray-500">{material.unit}</span>
        </form>
      </td>
      <td className="py-2.5 pr-4">
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${materialStatusColors[material.status] ?? ''}`}>
          {material.status.replace('_', ' ')}
        </span>
      </td>
      <td className="py-2.5 text-right space-x-2">
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              onClick={() => void form.handleSubmit()}
              disabled={!canSubmit || mutation.isPending}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
            >
              {mutation.isPending ? '…' : 'Save'}
            </button>
          )}
        </form.Subscribe>
        <button
          onClick={onDone}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 mt-1">{mutation.error.message}</p>
        )}
      </td>
    </tr>
  );
}

function FieldError({ field }: { field: { state: { meta: { errors: unknown[] } } } }) {
  const err = field.state.meta.errors[0];
  if (!err) return null;
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}
