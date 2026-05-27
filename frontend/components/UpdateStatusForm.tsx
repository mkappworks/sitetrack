'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { updateProjectStatus } from '../lib/actions/project.actions';

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export function UpdateStatusForm({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(status: string) {
    startTransition(async () => {
      await updateProjectStatus(projectId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {PROJECT_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => handleChange(s)}
          disabled={isPending || s === currentStatus}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            s === currentStatus
              ? 'bg-blue-600 text-white cursor-default'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {s.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}
