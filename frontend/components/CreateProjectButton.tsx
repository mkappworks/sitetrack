'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { useCreateProject } from '../lib/mutations/projects';
import { CreateProjectSchema } from '../lib/validation/forms';

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateProject();

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      location: '',
      status: 'PLANNING' as 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
    },
    validators: { onChange: CreateProjectSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      form.reset();
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + New project
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
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">New project</h2>
          <Link
            href="/projects/new"
            className="text-xs text-blue-600 hover:text-blue-700"
            onClick={() => setOpen(false)}
          >
            with materials →
          </Link>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-3"
        >
          <form.Field name="name">
            {(field) => (
              <label className="block">
                <span className="label">Project name *</span>
                <input
                  className="input"
                  placeholder="Warehouse Extension Phase 2"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError field={field} />
              </label>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <label className="block">
                <span className="label">Description</span>
                <textarea
                  rows={2}
                  className="input resize-none"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>

          <form.Field name="location">
            {(field) => (
              <label className="block">
                <span className="label">Location</span>
                <input
                  className="input"
                  placeholder="Frankfurt, Germany"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </label>
            )}
          </form.Field>

          <form.Field name="status">
            {(field) => (
              <label className="block">
                <span className="label">Status</span>
                <select
                  className="input"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value as typeof field.state.value)}
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </label>
            )}
          </form.Field>

          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error.message}</p>
          )}

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={!canSubmit}>
                  {isSubmitting || mutation.isPending ? 'Creating…' : 'Create project'}
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
