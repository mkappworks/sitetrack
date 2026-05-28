import { getServerSession } from 'next-auth';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { authOptions } from '../../lib/auth';
import { getQueryClient } from '../../lib/get-query-client';
import { equipmentsQueryOptions } from '../../lib/queries/equipments';
import { CreateEquipmentButton } from '../../components/CreateEquipmentButton';
import { EquipmentsListClient } from './EquipmentsListClient';

const PAGE_SIZE = 20;

export default async function EquipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const session = await getServerSession(authOptions);
  const canCreate =
    session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    equipmentsQueryOptions({
      limit: PAGE_SIZE,
      offset,
      token: session?.accessToken,
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Equipment</h1>
        </div>
        {canCreate && <CreateEquipmentButton />}
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <EquipmentsListClient page={page} pageSize={PAGE_SIZE} />
      </HydrationBoundary>
    </div>
  );
}
