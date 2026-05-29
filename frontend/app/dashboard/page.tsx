import { Suspense } from 'react';
import { requireAuthedSession } from '../../lib/require-session';
import { CreateProjectButton } from '../../components/CreateProjectButton';
import { CardGridSkeleton } from '../../components/CardGridSkeleton';
import { StatusSummarySection } from './StatusSummarySection';
import { RecentProjectsSection } from './RecentProjectsSection';

export default async function DashboardPage() {
  const session = await requireAuthedSession();
  const canCreate =
    session.user.role === 'ADMIN' || session.user.role === 'MANAGER';

  // The shell (header) paints immediately. Each data section streams in under
  // its own Suspense boundary, so the fast status aggregate doesn't wait on
  // the slower projects list — and a failure/slowness in one no longer blocks
  // or blanks the other.
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {session.user.name}
          </p>
        </div>
        {canCreate && <CreateProjectButton />}
      </div>

      <Suspense fallback={<StatusSummarySkeleton />}>
        <StatusSummarySection token={session.accessToken} />
      </Suspense>

      <Suspense fallback={<RecentProjectsSkeleton />}>
        <RecentProjectsSection token={session.accessToken} />
      </Suspense>
    </div>
  );
}

function StatusSummarySkeleton() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
          <span className="block h-3 w-12 rounded bg-gray-100 animate-pulse mb-2" />
          <span className="block h-7 w-10 rounded bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function RecentProjectsSkeleton() {
  return (
    <div className="mt-6">
      <span className="block h-4 w-28 rounded bg-gray-100 animate-pulse mb-3" />
      <CardGridSkeleton />
    </div>
  );
}
