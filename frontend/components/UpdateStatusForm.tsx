'use client';

import { useUpdateProjectStatus } from '../lib/mutations/projects';
import type { ProjectStatusEnum } from '../lib/validation/forms';
import type { z } from 'zod';

type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
const PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export function UpdateStatusForm({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string;
}) {
  const mutation = useUpdateProjectStatus();
  const optimisticStatus = mutation.variables?.status ?? currentStatus;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {PROJECT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => mutation.mutate({ id: projectId, status: s })}
            disabled={mutation.isPending || s === optimisticStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              s === optimisticStatus
                ? 'bg-blue-600 text-white cursor-default'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
      {mutation.isError && (
        <p className="text-xs text-red-600">Failed: {mutation.error.message}</p>
      )}
    </div>
  );
}
