'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAddMaterial } from '../lib/mutations/projects';
import { AddMaterialSchema } from '../lib/validation/forms';

export function AddMaterialForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useAddMaterial({ projectId });

  const form = useForm({
    defaultValues: { name: '', quantity: 0, unit: '' },
    validators: { onChange: AddMaterialSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ ...value, projectId });
      form.reset();
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        + Add material
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex gap-3 flex-wrap items-end"
    >
      <form.Field name="name">
        {(field) => (
          <label className="block">
            <span className="label">Material</span>
            <input
              className="input w-40"
              placeholder="Concrete"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </label>
        )}
      </form.Field>

      <form.Field name="quantity">
        {(field) => (
          <label className="block">
            <span className="label">Qty</span>
            <input
              type="number"
              step="0.01"
              className="input w-24"
              placeholder="50"
              value={field.state.value || ''}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(Number(e.target.value))}
            />
            <FieldError field={field} />
          </label>
        )}
      </form.Field>

      <form.Field name="unit">
        {(field) => (
          <label className="block">
            <span className="label">Unit</span>
            <input
              className="input w-20"
              placeholder="m³"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </label>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {isSubmitting || mutation.isPending ? 'Adding…' : 'Add'}
          </button>
        )}
      </form.Subscribe>

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

      {mutation.isError && (
        <p className="w-full text-sm text-red-600">{mutation.error.message}</p>
      )}
    </form>
  );
}

function FieldError({ field }: { field: { state: { meta: { errors: unknown[] } } } }) {
  const err = field.state.meta.errors[0];
  if (!err) return null;
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}
