// StatusSummary.tsx - Server Component, pure display
export function StatusSummary({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const stats = [
    { label: 'Total', value: total, color: 'text-gray-900' },
    { label: 'Active', value: counts['ACTIVE'] ?? 0, color: 'text-green-600' },
    { label: 'Planning', value: counts['PLANNING'] ?? 0, color: 'text-gray-500' },
    { label: 'On hold', value: counts['ON_HOLD'] ?? 0, color: 'text-amber-600' },
    { label: 'Completed', value: counts['COMPLETED'] ?? 0, color: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">{s.label}</p>
          <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
