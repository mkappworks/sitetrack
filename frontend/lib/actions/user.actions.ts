'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';
import { gqlClient } from '../graphql/client';
import { CREATE_USER_MUTATION } from '../graphql/queries';
import { CreateUserSchema } from '../validation/forms';

export type CreateUserResult = { ok: true } | { ok: false; error: string };

export async function createUser(input: unknown): Promise<CreateUserResult> {
  // Server Actions are publicly invokable; re-check the caller is an admin
  // since the page-level guard doesn't apply on RPC.
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') {
    return { ok: false, error: 'Forbidden — admin role required.' };
  }

  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const client = await gqlClient();

  try {
    await client.request(CREATE_USER_MUTATION, { input: parsed.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create user';
    // Generic error for the duplicate-email case so an attacker who reaches
    // this endpoint can't enumerate existing users by trial. The trade-off
    // is admin UX: legitimate admins see a less helpful message, but they
    // can disambiguate by trying a different email.
    if (msg.includes('already registered')) {
      return { ok: false, error: 'Could not create account. Try a different email.' };
    }
    if (msg.toLowerCase().includes('admin role')) {
      return { ok: false, error: 'ADMIN role cannot be assigned.' };
    }
    return { ok: false, error: msg };
  }

  revalidatePath('/admin');
  redirect('/admin');
}
