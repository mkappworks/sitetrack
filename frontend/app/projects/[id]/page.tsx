import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { authOptions } from '../../../lib/auth';
import { getQueryClient } from '../../../lib/get-query-client';
import { projectByIdQueryOptions } from '../../../lib/queries/projects';
import { ProjectDetailClient } from './ProjectDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const queryClient = getQueryClient();
  try {
    await queryClient.fetchQuery(
      projectByIdQueryOptions({ id, token: session?.accessToken }),
    );
  } catch {
    notFound();
  }

  const canEdit =
    session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER';

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectDetailClient id={id} canEdit={canEdit} />
    </HydrationBoundary>
  );
}
