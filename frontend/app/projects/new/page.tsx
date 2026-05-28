import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../../lib/auth';
import { CreateProjectWithMaterialsForm } from './CreateProjectWithMaterialsForm';

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== 'ADMIN' && session?.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">New project</h1>
      <p className="text-sm text-gray-500 mb-8">
        Project and its initial materials are inserted atomically — if any
        material fails validation, the project is rolled back.
      </p>
      <CreateProjectWithMaterialsForm />
    </div>
  );
}
