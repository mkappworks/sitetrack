'use client';

import { useForm } from '@tanstack/react-form';
import { useUpdateProject } from '../lib/mutations/projects';
import { UpdateProjectSchema } from '../lib/validation/forms';
import { ManagerSelect } from './ManagerSelect';

interface Props {
  project: {
    id: string;
    name: string;
    description?: string | null;
    location?: string | null;
    manager?: { id: string } | null;
  };
  onDone: () => void;
}

export function EditProjectForm({ project, onDone }: Props) {
  const mutation = useUpdateProject();

  const form = useForm({
    defaultValues: {
      id: project.id,
      name: project.name,
      description: project.description ?? '',
      location: project.location ?? '',
      managerId: project.manager?.id ?? '',
    },
    validators: { onChange: UpdateProjectSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="card space-y-4"
    >
      <h2 className="text-sm font-medium text-gray-700">Edit project</h2>

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
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      <form.Field name="managerId">
        {(field) => (
          <ManagerSelect
            label="Manager"
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
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {isSubmitting || mutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={onDone}>
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
