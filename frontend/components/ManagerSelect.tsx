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
  // When set, surfaces "Currently: <name>" above the select and appends
  // "(current)" to the matching option — used on edit forms so admins
  // can tell at a glance what's already assigned vs what they're about
  // to change to. Create forms omit both (no current assignment yet).
  currentManagerId?: string | null;
  currentManagerName?: string | null;
}

export function ManagerSelect({
  value,
  onChange,
  onBlur,
  disabled,
  label,
  currentManagerId,
  currentManagerName,
}: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === 'ADMIN';
  // Only admins can fetch + assign managers; the hook still runs (enabled:false)
  // when not admin, returning undefined data — caller can hide its render.
  const { data: managers, isLoading } = useQuery({
    ...managersQueryOptions({ token: session?.accessToken }),
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  // Has the value been changed away from the originally-loaded assignment?
  const isDirty = currentManagerId !== undefined && value !== (currentManagerId ?? '');

  return (
    <label className="block">
      {label && <span className="label">{label}</span>}

      {currentManagerId !== undefined && (
        <p className="text-xs text-gray-500 mb-1">
          Currently:{' '}
          <span className="text-gray-900 font-medium">
            {currentManagerName ?? <span className="text-gray-400">Unassigned</span>}
          </span>
          {isDirty && (
            <span className="text-amber-600 ml-2">· unsaved change</span>
          )}
        </p>
      )}

      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled || isLoading}
      >
        <option value="">
          {isLoading
            ? 'Loading…'
            : currentManagerId === null || currentManagerId === ''
              ? 'Unassigned (current)'
              : 'Unassigned'}
        </option>
        {managers?.map((m) => {
          const isCurrent = m.id === currentManagerId;
          return (
            <option key={m.id} value={m.id}>
              {m.name} ({m.email}){isCurrent ? ' — current' : ''}
            </option>
          );
        })}
      </select>
    </label>
  );
}
