'use server';

import { z } from 'zod';
import { gqlClient } from '../graphql/client';
import {
  REVOKE_SESSION_MUTATION,
  REVOKE_USER_SESSION_MUTATION,
  REVOKE_ALL_USER_SESSIONS_MUTATION,
} from '../graphql/queries';
import type { ActionResult } from './project.actions';

const IdSchema = z.object({ id: z.string().min(1, 'Invalid id') });
const UserSessionSchema = z.object({
  userId: z.uuid('Invalid user id'),
  sessionId: z.string().min(1, 'Invalid session id'),
});

// Self-service: revoke one of your own sessions. The backend enforces
// ownership (revokeSessionForUser checks the family belongs to the caller),
// so this can't be used to revoke someone else's session even if the id
// leaks.
export async function revokeSession(id: string): Promise<ActionResult<{ id: string }>> {
  const parsed = IdSchema.safeParse({ id });
  if (!parsed.success) return { ok: false, error: 'Invalid session id' };

  const client = await gqlClient();
  try {
    await client.request<{ revokeSession: boolean }>(REVOKE_SESSION_MUTATION, {
      id: parsed.data.id,
    });
    return { ok: true, data: { id: parsed.data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to revoke session' };
  }
}

// Admin: revoke a specific session for any user.
export async function revokeUserSession(
  userId: string,
  sessionId: string,
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = UserSessionSchema.safeParse({ userId, sessionId });
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const client = await gqlClient();
  try {
    await client.request<{ revokeUserSession: boolean }>(REVOKE_USER_SESSION_MUTATION, {
      userId: parsed.data.userId,
      sessionId: parsed.data.sessionId,
    });
    return { ok: true, data: { sessionId: parsed.data.sessionId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to revoke session' };
  }
}

// Admin: force-logout — revoke ALL of a user's sessions.
export async function revokeAllUserSessions(
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = z.uuid('Invalid user id').safeParse(userId);
  if (!parsed.success) return { ok: false, error: 'Invalid user id' };

  const client = await gqlClient();
  try {
    await client.request<{ revokeAllUserSessions: boolean }>(
      REVOKE_ALL_USER_SESSIONS_MUTATION,
      { userId: parsed.data },
    );
    return { ok: true, data: { userId: parsed.data } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to revoke sessions' };
  }
}
