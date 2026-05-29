import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../../lib/auth';
import { TrashClient } from './TrashClient';

export default async function TrashPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Trash</h1>
        <p className="text-sm text-gray-500 mt-1">
          Soft-deleted projects and equipment. Restore brings rows back into
          their active lists; the underlying data was never removed.
        </p>
      </div>

      <TrashClient />
    </div>
  );
}
