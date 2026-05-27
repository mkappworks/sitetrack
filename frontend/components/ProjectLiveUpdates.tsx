'use client';

import { useEffect, useState } from 'react';
import { createClient } from 'graphql-ws';
import { PROJECT_UPDATED_SUBSCRIPTION } from '../lib/graphql/queries';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ProjectUpdate {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

/**
 * CLIENT COMPONENT — subscribes to real-time project updates via WebSocket.
 * When the subscribed project is updated by any user, the page auto-refreshes.
 *
 * This demonstrates the key Server/Client boundary in Next.js App Router:
 * - The page data is fetched server-side (ProjectDetailPage)
 * - Real-time updates need a WebSocket → must be a Client Component
 * - The two layers work together: server renders the initial state,
 *   client handles live updates and calls router.refresh() to re-fetch
 */
export function ProjectLiveUpdates({ projectId }: { projectId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ?? 'ws://localhost:3001/graphql';

    const client = createClient({
      url: wsUrl,
      connectionParams: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      on: {
        connected: () => setConnected(true),
        closed: () => setConnected(false),
      },
    });

    const unsubscribe = client.subscribe(
      { query: PROJECT_UPDATED_SUBSCRIPTION },
      {
        next({ data }) {
          const update = (data as any)?.projectUpdated as ProjectUpdate;
          if (!update) return;

          // Only act if this is the project we're viewing
          if (update.id === projectId) {
            setLastUpdate(`Updated ${new Date(update.updatedAt).toLocaleTimeString()}`);
            // Trigger a server-side re-fetch — Next.js re-runs the Server Component
            router.refresh();
          }
        },
        error(err) {
          console.error('Subscription error:', err);
          setConnected(false);
        },
        complete() {
          setConnected(false);
        },
      },
    );

    return () => {
      unsubscribe();
      client.dispose();
    };
  }, [session?.accessToken, projectId, router]);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      {/* Connection indicator */}
      <span
        className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`}
        title={connected ? 'Live updates connected' : 'Connecting…'}
      />
      <span>{connected ? 'Live' : 'Connecting…'}</span>
      {lastUpdate && <span className="text-gray-300">· {lastUpdate}</span>}
    </div>
  );
}
