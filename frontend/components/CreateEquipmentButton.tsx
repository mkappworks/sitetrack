'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useCreateEquipment } from '../lib/mutations/equipments';
import { CreateEquipmentSchema } from '../lib/validation/forms';
import { ManagerSelect } from './ManagerSelect';

export function CreateEquipmentButton() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateEquipment();

  const form = useForm({
    defaultValues: { name: '', description: '', managerId: '' },
    validators: { onChange: CreateEquipmentSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      form.reset();
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + New equipment
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4">New equipment</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-3"
        >
          <form.Field name="name">
            {(field) => (
              <div>
                <label className="label">Name *</label>
                <input
                  className="input"
                  placeholder="CAT 320 Excavator"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div>
                <label className="label">Description</label>
                <textarea
                  rows={2}
                  className="input resize-none"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="managerId">
            {(field) => (
              <ManagerSelect
                label="Assign to manager"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>

          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error.message}</p>
          )}

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={!canSubmit}>
                  {isSubmitting || mutation.isPending ? 'Creating…' : 'Create equipment'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    form.reset();
                    setOpen(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}

function FieldError({ field }: { field: { state: { meta: { errors: unknown[] } } } }) {
  const err = field.state.meta.errors[0];
  if (!err) return null;
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}
