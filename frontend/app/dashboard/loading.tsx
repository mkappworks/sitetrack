import { CardGridSkeleton } from '../../components/CardGridSkeleton';

// Suspense fallback for the dashboard Server Component. The page blocks on
// fetchQuery server-side (no client isLoading state), so the skeleton lives
// here as a route-segment loading.tsx — Next.js renders it automatically
// while the async page awaits. Mirrors the real layout: header, 5-stat
// summary, recent-projects grid.
export default function DashboardLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="block h-7 w-40 rounded bg-gray-100 animate-pulse" />
          <span className="block h-4 w-56 rounded bg-gray-100 animate-pulse mt-2" />
        </div>
        <span className="block h-10 w-32 rounded-lg bg-gray-100 animate-pulse" />
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <span className="block h-3 w-12 rounded bg-gray-100 animate-pulse mb-2" />
            <span className="block h-7 w-10 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <span className="block h-4 w-28 rounded bg-gray-100 animate-pulse mb-3" />
        <CardGridSkeleton />
      </div>
    </div>
  );
}
