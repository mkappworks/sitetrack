// Card-shaped skeleton for the projects + equipment grids. Mirrors the
// post-load layout so the transition feels continuous. Cells animate-pulse
// in unison; subtle variance in the line widths reads as "real text" rather
// than a uniform block.

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="flex items-start justify-between mb-3">
            <span className="block h-5 w-2/3 rounded bg-gray-100 animate-pulse" />
            <span className="block h-5 w-14 rounded-md bg-gray-100 animate-pulse" />
          </div>
          <span className="block h-3 w-full rounded bg-gray-100 animate-pulse mb-2" />
          <span className="block h-3 w-4/5 rounded bg-gray-100 animate-pulse mb-4" />
          <div className="flex gap-3">
            <span className="block h-3 w-20 rounded bg-gray-100 animate-pulse" />
            <span className="block h-3 w-24 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
