// StatusBadge.tsx
const statusStyles: Record<string, string> = {
  PLANNING:  'bg-gray-100 text-gray-600',
  ACTIVE:    'bg-green-100 text-green-700',
  ON_HOLD:   'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
