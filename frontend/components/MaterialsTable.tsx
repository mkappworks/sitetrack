const materialStatusColors: Record<string, string> = {
  ORDERED:    'bg-gray-100 text-gray-600',
  IN_TRANSIT: 'bg-amber-100 text-amber-700',
  ON_SITE:    'bg-green-100 text-green-700',
  USED:       'bg-blue-100 text-blue-700',
  RETURNED:   'bg-purple-100 text-purple-700',
};

export function MaterialsTable({
  materials,
  canEdit,
}: {
  materials: { id: string; name: string; quantity: number; unit: string; status: string }[];
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Material</th>
            <th className="text-right py-2 pr-4 font-medium text-gray-500">Quantity</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {materials.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4 font-medium text-gray-900">{m.name}</td>
              <td className="py-2.5 pr-4 text-right text-gray-500 tabular-nums">
                {m.quantity} {m.unit}
              </td>
              <td className="py-2.5 pr-4">
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${materialStatusColors[m.status] ?? ''}`}>
                  {m.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
