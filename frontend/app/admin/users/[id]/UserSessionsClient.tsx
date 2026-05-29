'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { userSessionsQueryOptions } from '../../../../lib/queries/sessions';
import {
  useRevokeUserSession,
  useRevokeAllUserSessions,
} from '../../../../lib/mutations/sessions';
import { SessionList } from '../../../../components/SessionList';
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal';

export function UserSessionsClient({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const { data, isLoading, isError, error } = useQuery(
    userSessionsQueryOptions({ userId, token }),
  );
  const revokeOne = useRevokeUserSession(userId);
  const revokeAll = useRevokeAllUserSessions(userId);

  const [confirmAll, setConfirmAll] = useState(false);
  const count = data?.length ?? 0;

  return (
    <section className="card max-w-2xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-medium text-gray-900">
            Active sessions {!isLoading && count > 0 && (
              <span className="text-gray-400 font-normal">({count})</span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Devices signed in as this user. Revoking logs out that device.
          </p>
        </div>
        {count > 0 && (
          <button
            onClick={() => setConfirmAll(true)}
            disabled={revokeAll.isPending}
            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-40 whitespace-nowrap"
          >
            {revokeAll.isPending ? 'Revoking…' : 'Force logout (all)'}
          </button>
        )}
      </div>

      {(revokeOne.isError || revokeAll.isError) && (
        <p className="text-sm text-red-600 mb-3">
          {(revokeOne.error ?? revokeAll.error)?.message}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Failed to load sessions: {error.message}</p>
      ) : (
        <SessionList
          sessions={data ?? []}
          revokingId={revokeOne.isPending ? revokeOne.variables : null}
          onRevoke={(id) => revokeOne.mutate(id)}
          emptyCopy="This user has no active sessions."
        />
      )}

      <ConfirmDeleteModal
        open={confirmAll}
        title="Force logout all sessions?"
        description={
          <>
            All {count} active {count === 1 ? 'session' : 'sessions'} for{' '}
            <strong className="text-gray-900">{userName}</strong> will be
            revoked. They’ll need to sign in again on every device.
          </>
        }
        confirmLabel="Force logout"
        isDeleting={revokeAll.isPending}
        error={revokeAll.isError ? revokeAll.error.message : null}
        onCancel={() => {
          setConfirmAll(false);
          revokeAll.reset();
        }}
        onConfirm={async () => {
          await revokeAll.mutateAsync();
          setConfirmAll(false);
        }}
      />
    </section>
  );
}
