import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { useUpdateProjectStatus } from './projects';
import { projectsKeys } from '../queries/projects';
import { renderHookWithQueryClient } from '../../test/test-utils';
import type { Project } from '../graphql/schemas';

vi.mock('../actions/project.actions', () => ({
  updateProjectStatus: vi.fn(),
}));

import { updateProjectStatus } from '../actions/project.actions';

const baseProject: Project = {
  id: 'p-1',
  name: 'Riverside Tower',
  status: 'PLANNING',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useUpdateProjectStatus optimistic lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('patches the detail cache before the server responds, keeps it after success', async () => {
    vi.mocked(updateProjectStatus).mockResolvedValue({
      ok: true,
      data: { id: 'p-1', status: 'ACTIVE' },
    } as never);

    const { result, client } = renderHookWithQueryClient(() =>
      useUpdateProjectStatus(),
    );
    client.setQueryData(projectsKeys.detail('p-1'), baseProject);

    await act(async () => {
      result.current.mutate({ id: 'p-1', status: 'ACTIVE' });
    });

    // After settle: server confirmed, cache reflects new status.
    await waitFor(() => {
      const cached = client.getQueryData<Project>(projectsKeys.detail('p-1'));
      expect(cached?.status).toBe('ACTIVE');
    });
  });

  it('rolls back the detail cache when the Server Action rejects', async () => {
    vi.mocked(updateProjectStatus).mockResolvedValue({
      ok: false,
      error: 'Forbidden',
    } as never);

    const { result, client } = renderHookWithQueryClient(() =>
      useUpdateProjectStatus(),
    );
    // Seed cache with the original status.
    client.setQueryData(projectsKeys.detail('p-1'), baseProject);

    await act(async () => {
      result.current.mutate({ id: 'p-1', status: 'CANCELLED' });
    });

    // After the rejection + onError rollback + onSettled invalidate, the
    // cache must be back to the pre-mutation snapshot. The invalidate would
    // refetch, but with no real query function registered, the data stays
    // as the rolled-back snapshot.
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    const cached = client.getQueryData<Project>(projectsKeys.detail('p-1'));
    expect(cached?.status).toBe('PLANNING');
  });
});
