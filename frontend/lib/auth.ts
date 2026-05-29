import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { gqlFetch } from './graphql/client';
import {
  LOGIN_MUTATION,
  REFRESH_TOKENS_MUTATION,
  LOGOUT_MUTATION,
} from './graphql/queries';

interface AuthPayloadResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: { id: string; name: string; email: string; role: string };
}

interface LoginResponse {
  login: AuthPayloadResponse;
}

interface RefreshResponse {
  refreshTokens: AuthPayloadResponse;
}

// Refresh `ACCESS_REFRESH_LEAD_MS` before actual expiry. Keeps us from
// ever issuing a request with a token that's about to die mid-flight.
const ACCESS_REFRESH_LEAD_MS = 60_000;

// In-process Promise cache. Parallel jwt() calls within the same Next.js
// process — common with multiple browser tabs hitting Server Components
// in quick succession — collapse to a single refresh round-trip. The
// FIRST call kicks off the rotation; later callers await the same promise
// and receive the same fresh tokens, avoiding the "second tab triggers
// reuse-detection" race that would otherwise revoke the whole family.
//
// Limitation: this is per-process. A multi-process / multi-server
// deployment still has a race; mitigation there is a Redis-backed lock,
// out of scope for now.
const inflightRefresh = new Map<string, Promise<AuthPayloadResponse | null>>();

async function refreshOnce(refreshToken: string): Promise<AuthPayloadResponse | null> {
  const cached = inflightRefresh.get(refreshToken);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const data = await gqlFetch<RefreshResponse>(REFRESH_TOKENS_MUTATION, {
        input: { refreshToken },
      });
      return data.refreshTokens;
    } catch (err) {
      // Log so reuse-detection / expired-refresh surface in server logs;
      // returning null signals "force re-login" upstream.
      console.error('NextAuth refresh failed:', err);
      return null;
    } finally {
      // Clean up shortly after settling so the cache doesn't pin stale
      // entries forever. The 5s window covers callers that started
      // awaiting before the first promise resolved.
      setTimeout(() => inflightRefresh.delete(refreshToken), 5_000);
    }
  })();

  inflightRefresh.set(refreshToken, promise);
  return promise;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const data = await gqlFetch<LoginResponse>(LOGIN_MUTATION, {
            input: { email: credentials.email, password: credentials.password },
          });
          const { accessToken, refreshToken, accessTokenExpiresAt, user } = data.login;
          // The returned object becomes the `user` arg in the first jwt() call.
          return { ...user, accessToken, refreshToken, accessTokenExpiresAt };
        } catch (err) {
          // Log so reachability/parse errors surface in logs instead of
          // masquerading as "Invalid email or password" on the login page
          console.error('NextAuth credentials authorize failed:', err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // First call after sign-in: persist everything we got from authorize.
      if (user) {
        const u = user as unknown as {
          id: string;
          role: string;
          accessToken: string;
          refreshToken: string;
          accessTokenExpiresAt: string;
        };
        token.id = u.id;
        token.role = u.role;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.accessTokenExpiresAt = Number(u.accessTokenExpiresAt);
        return token;
      }

      // Subsequent calls: refresh proactively if access token is about to
      // expire. `accessTokenExpiresAt` is the absolute ms-since-epoch
      // timestamp the backend issued on login/refresh.
      const expiresAt = (token.accessTokenExpiresAt as number | undefined) ?? 0;
      if (Date.now() < expiresAt - ACCESS_REFRESH_LEAD_MS) {
        return token;
      }
      if (!token.refreshToken) {
        // No refresh token to use — clear access fields so requests fail
        // fast and the user is bounced to login.
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      const refreshed = await refreshOnce(token.refreshToken as string);
      if (!refreshed) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }
      return {
        ...token,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accessTokenExpiresAt: Number(refreshed.accessTokenExpiresAt),
        error: undefined,
      };
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      // Surface refresh failure on the session so consumers can react
      // (e.g. middleware can force a redirect to /login). The presence
      // of `error` is the signal; values follow NextAuth convention.
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },

  events: {
    // Best-effort logout. NextAuth invalidates its own session cookie no
    // matter what — this hits the backend so the refresh token's row is
    // marked revoked. Failure is swallowed (network down, backend down
    // mid-logout) since the client is about to lose access either way.
    async signOut({ token }) {
      const refreshToken = (token as any)?.refreshToken;
      if (!refreshToken) return;
      try {
        await gqlFetch(LOGOUT_MUTATION, { input: { refreshToken } });
      } catch (err) {
        console.error('NextAuth signOut: logout mutation failed:', err);
      }
    },
  },

  pages: {
    signIn: '/login',
  },

  session: { strategy: 'jwt' },
};

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    accessToken: string;
    error?: string;
    user: { id: string; name?: string | null; email?: string | null; role: string };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    error?: string;
  }
}
