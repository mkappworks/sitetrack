import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../lib/auth';

// Server Component — reads session on the server, redirects instantly
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');
  else redirect('/login');
}
