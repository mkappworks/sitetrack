'use client';

import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { useCreateProjectWithMaterials } from '../../../lib/mutations/projects';
import { CreateProjectWithMaterialsSchema } from '../../../lib/validation/forms';

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export function CreateProjectWithMaterialsForm() {
  const router = useRouter();
  const mutation = useCreateProjectWithMaterials();

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      location: '',
      status: 'PLANNING' as (typeof PROJECT_STATUSES)[number],
      materials: [{ name: '', quantity: 0, unit: '' }],
    },
    validators: { onChange: CreateProjectWithMaterialsSchema },
    onSubmit: async ({ value }) => {
      const data = await mutation.mutateAsync(value);
      router.push(`/projects/${data.id}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-8"
    >
      <section className="card space-y-4">
        <h2 className="text-base font-medium text-gray-900">Project</h2>

        <form.Field name="name">
          {(field) => (
            <label className="block">
              <span className="label">Name</span>
              <input
                className="input"
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
              <span className="label">Description (optional)</span>
              <textarea
                className="input"
                rows={2}
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </label>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="location">
            {(field) => (
              <label className="block">
                <span className="label">Location (optional)</span>
                <input
                  className="input"
                  value={field.state.value ?? ''}
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
                  onChange={(e) => field.handleChange(e.target.value as (typeof PROJECT_STATUSES)[number])}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-base font-medium text-gray-900">Initial materials</h2>

        <form.Field name="materials" mode="array">
          {(materialsField) => (
            <>
              <div className="space-y-3">
                {materialsField.state.value.map((_, i) => (
                  <div key={i} className="flex gap-3 items-end flex-wrap p-3 bg-gray-50 rounded-lg">
                    <form.Field name={`materials[${i}].name`}>
                      {(field) => (
                        <div className="flex-1 min-w-40">
                          <label className="label">Material</label>
                          <input
                            className="input"
                            placeholder="Portland Cement"
                            value={field.state.value as string}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          <FieldError field={field} />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`materials[${i}].quantity`}>
                      {(field) => (
                        <div className="w-24">
                          <label className="label">Qty</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            placeholder="100"
                            value={(field.state.value as number) || ''}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(Number(e.target.value))}
                          />
                          <FieldError field={field} />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`materials[${i}].unit`}>
                      {(field) => (
                        <div className="w-20">
                          <label className="label">Unit</label>
                          <input
                            className="input"
                            placeholder="tonnes"
                            value={field.state.value as string}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          <FieldError field={field} />
                        </div>
                      )}
                    </form.Field>

                    <button
                      type="button"
                      onClick={() => materialsField.removeValue(i)}
                      disabled={materialsField.state.value.length <= 1}
                      className="btn-secondary text-xs disabled:opacity-40"
                      aria-label={`Remove material ${i + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => materialsField.pushValue({ name: '', quantity: 0, unit: '' })}
                className="btn-secondary text-sm"
              >
                + Add material row
              </button>
            </>
          )}
        </form.Field>
      </section>

      {mutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {mutation.error.message}
        </p>
      )}

      <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {isSubmitting || mutation.isPending ? 'Creating…' : 'Create project'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push('/projects')}
            >
              Cancel
            </button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

function FieldError({ field }: { field: { state: { meta: { errors: unknown[] } } } }) {
  const err = field.state.meta.errors[0];
  if (!err) return null;
  const msg = typeof err === 'string' ? err : (err as { message?: string }).message;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}
