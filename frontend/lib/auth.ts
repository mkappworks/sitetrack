import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { gqlFetch } from './graphql/client';
import { LOGIN_MUTATION } from './graphql/queries';

interface LoginResponse {
  login: {
    accessToken: string;
    user: { id: string; name: string; email: string; role: string };
  };
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

          const { accessToken, user } = data.login;
          return { ...user, accessToken };
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
    // Persist accessToken and role in the JWT cookie
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },

    // Expose accessToken and role on the session object (available to Server Components)
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      return session;
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
    user: { id: string; name?: string | null; email?: string | null; role: string };
  }
}
