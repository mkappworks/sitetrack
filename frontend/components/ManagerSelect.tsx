'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { managersQueryOptions } from '../lib/queries/users';

interface Props {
  value: string;
  onChange: (managerId: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  // Renders this caption above the select. Optional so callers in
  // already-labelled contexts (e.g. wrapped in a form.Field) can omit it.
  label?: string;
}

export function ManagerSelect({ value, onChange, onBlur, disabled, label }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === 'ADMIN';
  // Only admins can fetch + assign managers; the hook still runs (enabled:false)
  // when not admin, returning undefined data — caller can hide its render.
  const { data: managers, isLoading } = useQuery({
    ...managersQueryOptions({ token: session?.accessToken }),
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled || isLoading}
      >
        <option value="">{isLoading ? 'Loading…' : 'Unassigned'}</option>
        {managers?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.email})
          </option>
        ))}
      </select>
    </label>
  );
}
