'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { equipmentByIdQueryOptions } from '../../../lib/queries/equipments';

export function EquipmentDetailClient({ id }: { id: string }) {
  const { data: session } = useSession();
  const { data: equipment } = useQuery(
    equipmentByIdQueryOptions({ id, token: session?.accessToken }),
  );

  if (!equipment) return null;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/equipments" className="hover:text-gray-900">Equipment</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{equipment.name}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{equipment.name}</h1>
        {equipment.description && (
          <p className="text-gray-500 mt-1">{equipment.description}</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Details</h2>
        <dl className="text-sm space-y-2">
          <div className="flex">
            <dt className="w-32 text-gray-500">Manager</dt>
            <dd className="text-gray-900">
              {equipment.manager?.name ?? <span className="text-gray-400">Unassigned</span>}
            </dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-gray-500">Created</dt>
            <dd className="text-gray-900">
              {new Date(equipment.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-gray-500">Last updated</dt>
            <dd className="text-gray-900">
              {new Date(equipment.updatedAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
