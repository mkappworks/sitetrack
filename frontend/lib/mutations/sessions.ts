'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsKeys } from '../queries/sessions';
import {
  revokeSession,
  revokeUserSession,
  revokeAllUserSessions,
} from '../actions/sessions.actions';

async function unwrap<T>(
  p: Promise<{ ok: true; data: T } | { ok: false; error: string }>,
): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

// Self-service revoke — refreshes the caller's own session list.
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(revokeSession(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.mine() });
    },
  });
}

// Admin revoke of a single session for a given user.
export function useRevokeUserSession(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => unwrap(revokeUserSession(userId, sessionId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.forUser(userId) });
    },
  });
}

// Admin force-logout — revoke all of a user's sessions.
export function useRevokeAllUserSessions(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(revokeAllUserSessions(userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.forUser(userId) });
    },
  });
}
