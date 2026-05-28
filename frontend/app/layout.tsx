import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { SessionProvider } from './session-provider';
import { Providers } from './providers';
import { authOptions } from '../lib/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SiteTrack — Construction Project Tracker',
  description: 'Manage construction projects, materials, and teams',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server Component can read the session directly — no client-side fetch needed
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* SessionProvider makes session available to Client Components.
            Providers wraps TanStack Query — needed for any useQuery in client tree. */}
        <SessionProvider session={session}>
          <Providers>{children}</Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
