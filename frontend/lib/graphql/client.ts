import { GraphQLClient } from 'graphql-request';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';

/**
 * SERVER-SIDE GraphQL client.
 * Use this in Server Components and Server Actions.
 * Automatically injects the user's JWT from the session.
 *
 * Usage:
 *   const client = await gqlClient();
 *   const data = await client.request(PROJECTS_QUERY);
 */
export async function gqlClient(): Promise<GraphQLClient> {
  const session = await getServerSession(authOptions);
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

  return new GraphQLClient(`${backendUrl}/graphql`, {
    headers: session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {},
  });
}

/**
 * Universal fetch helper — works on both server and client.
 * On the server (no `window`), uses BACKEND_URL so server processes inside
 * the container can reach the backend by its compose service name.
 * On the client (browser), uses NEXT_PUBLIC_GRAPHQL_URL which is baked in
 * at build time and resolves through the host's port-forward.
 */
export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
  // Internal: guards against an infinite refresh→retry loop. Callers never
  // pass this.
  _retried = false,
): Promise<T> {
  const url = typeof window === 'undefined'
    ? `${process.env.BACKEND_URL ?? 'http://localhost:3001'}/graphql`
    : (process.env.NEXT_PUBLIC_GRAPHQL_URL ?? '/api/graphql');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    // Client-side only: an auth error usually means the access token expired
    // between SSR hydration and this interaction (the jwt-callback's proactive
    // refresh didn't fire in time). Ask NextAuth for a current session — that
    // re-runs the jwt callback server-side, rotating the refresh token — and
    // retry ONCE with the fresh access token. Server-side requests use
    // gqlClient + getServerSession, which is always fresh, so skip there.
    if (!_retried && typeof window !== 'undefined' && isAuthError(json)) {
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const fresh = session?.accessToken as string | undefined;
      // Only retry if we actually got a DIFFERENT token — otherwise the 401
      // isn't about staleness (e.g. a genuine permission error) and retrying
      // would just fail again.
      if (fresh && fresh !== token) {
        return gqlFetch<T>(query, variables, fresh, true);
      }
    }
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

// Heuristic auth-error detection across GraphQL error shapes: Apollo's
// UNAUTHENTICATED extension code, or a message mentioning unauthorized/jwt
// (Nest's UnauthorizedException surfaces as "Unauthorized").
function isAuthError(json: { errors?: Array<{ message?: string; extensions?: { code?: string } }> }): boolean {
  return !!json.errors?.some((e) => {
    const code = e?.extensions?.code;
    const msg = (e?.message ?? '').toLowerCase();
    return (
      code === 'UNAUTHENTICATED' ||
      msg.includes('unauthorized') ||
      msg.includes('unauthenticated') ||
      msg.includes('jwt')
    );
  });
}
