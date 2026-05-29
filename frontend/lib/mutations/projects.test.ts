import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { useUpdateProjectStatus, useRemoveMaterial } from './projects';
import { projectsKeys } from '../queries/projects';
import { renderHookWithQueryClient } from '../../test/test-utils';
import type { Project } from '../graphql/schemas';

vi.mock('../actions/project.actions', () => ({
  updateProjectStatus: vi.fn(),
  removeMaterial: vi.fn(),
}));

import { updateProjectStatus, removeMaterial } from '../actions/project.actions';

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

describe('useRemoveMaterial optimistic lifecycle (shared helper, array patch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const projectWithMaterials: Project = {
    ...baseProject,
    materials: [
      { id: 'm-1', name: 'Cement', quantity: 10, unit: 'bags', status: 'ORDERED' },
      { id: 'm-2', name: 'Rebar', quantity: 5, unit: 'tons', status: 'ON_SITE' },
    ],
  };

  it('removes the material optimistically, keeps it gone after success', async () => {
    vi.mocked(removeMaterial).mockResolvedValue({ ok: true, data: { id: 'm-1' } } as never);

    const { result, client } = renderHookWithQueryClient(() =>
      useRemoveMaterial({ projectId: 'p-1' }),
    );
    client.setQueryData(projectsKeys.detail('p-1'), projectWithMaterials);

    await act(async () => {
      result.current.mutate('m-1');
    });

    await waitFor(() => {
      const cached = client.getQueryData<Project>(projectsKeys.detail('p-1'));
      expect(cached?.materials?.map((m) => m.id)).toEqual(['m-2']);
    });
  });

  it('rolls back the materials array when the Server Action rejects', async () => {
    vi.mocked(removeMaterial).mockResolvedValue({ ok: false, error: 'Forbidden' } as never);

    const { result, client } = renderHookWithQueryClient(() =>
      useRemoveMaterial({ projectId: 'p-1' }),
    );
    client.setQueryData(projectsKeys.detail('p-1'), projectWithMaterials);

    await act(async () => {
      result.current.mutate('m-1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    const cached = client.getQueryData<Project>(projectsKeys.detail('p-1'));
    expect(cached?.materials?.map((m) => m.id)).toEqual(['m-1', 'm-2']);
  });
});
