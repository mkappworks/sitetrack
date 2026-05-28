'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { createUser } from '../../../lib/actions/user.actions';
import { CreateUserSchema } from '../../../lib/validation/forms';

export function CreateUserForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'VIEWER' as 'MANAGER' | 'VIEWER',
    },
    validators: { onChange: CreateUserSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await createUser(value);
      if (!result.ok) setServerError(result.error);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="card max-w-md space-y-4"
    >
      <h1 className="text-xl font-semibold">Create user</h1>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {serverError}
        </p>
      )}

      <form.Field name="name">
        {(field) => (
          <label className="block">
            <span className="text-sm">Name</span>
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

      <form.Field name="email">
        {(field) => (
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              className="input"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </label>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              className="input"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError field={field} />
          </label>
        )}
      </form.Field>

      <form.Field name="role">
        {(field) => (
          <label className="block">
            <span className="text-sm">Role</span>
            <select
              className="input"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value as 'MANAGER' | 'VIEWER')}
            >
              <option value="MANAGER">Manager</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <FieldError field={field} />
          </label>
        )}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting] as const}
      >
        {([canSubmit, isSubmitting]) => (
          <button type="submit" disabled={!canSubmit} className="btn-primary">
            {isSubmitting ? 'Creating…' : 'Create user'}
          </button>
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
