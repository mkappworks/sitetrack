import Link from 'next/link';

interface EquipmentCardProps {
  id: string;
  name: string;
  description?: string | null;
  manager?: { name: string } | null;
}

export function EquipmentCard({ equipment }: { equipment: EquipmentCardProps }) {
  return (
    <Link
      href={`/equipments/${equipment.id}`}
      className="card hover:shadow-md hover:border-gray-300 transition-all block group"
    >
      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
        {equipment.name}
      </h3>

      {equipment.description && (
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {equipment.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
        {equipment.manager && <span>👤 {equipment.manager.name}</span>}
      </div>
    </Link>
  );
}
