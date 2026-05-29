'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { mySessionsQueryOptions } from '../../lib/queries/sessions';
import { useRevokeSession } from '../../lib/mutations/sessions';
import { SessionList } from '../../components/SessionList';

export function SettingsClient() {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { data, isLoading, isError, error } = useQuery(
    mySessionsQueryOptions({ token }),
  );
  const revoke = useRevokeSession();

  return (
    <section className="card max-w-2xl">
      <div className="mb-4">
        <h2 className="text-base font-medium text-gray-900">Active sessions</h2>
        <p className="text-sm text-gray-500 mt-1">
          Devices currently signed in to your account. Revoke any you don’t
          recognize — that immediately logs out the device.
        </p>
      </div>

      {revoke.isError && (
        <p className="text-sm text-red-600 mb-3">{revoke.error.message}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load sessions: {error.message}</p>
      ) : (
        <SessionList
          sessions={data ?? []}
          highlightCurrent
          revokingId={revoke.isPending ? revoke.variables : null}
          onRevoke={(id) => revoke.mutate(id)}
        />
      )}
    </section>
  );
}
