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
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}
