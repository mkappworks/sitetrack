import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { authOptions } from '../../../lib/auth';
import { getQueryClient } from '../../../lib/get-query-client';
import { equipmentByIdQueryOptions } from '../../../lib/queries/equipments';
import { EquipmentDetailClient } from './EquipmentDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const queryClient = getQueryClient();
  try {
    await queryClient.fetchQuery(
      equipmentByIdQueryOptions({ id, token: session?.accessToken }),
    );
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EquipmentDetailClient id={id} />
    </HydrationBoundary>
  );
}
