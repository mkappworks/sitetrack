import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddMaterialForm } from './AddMaterialForm';
import { renderWithQueryClient } from '../test/test-utils';

vi.mock('../lib/actions/project.actions', () => ({
  addMaterial: vi.fn(),
}));

import { addMaterial } from '../lib/actions/project.actions';

const PROJECT_ID = '00000000-0000-0000-0000-000000000abc';

describe('AddMaterialForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the form when "+ Add material" is clicked', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AddMaterialForm projectId={PROJECT_ID} />);

    expect(screen.queryByPlaceholderText(/Concrete/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /\+ add material/i }));
    expect(screen.getByPlaceholderText(/Concrete/i)).toBeInTheDocument();
  });

  it('submits the typed input through addMaterial including the projectId', async () => {
    vi.mocked(addMaterial).mockResolvedValue({
      ok: true,
      data: { id: 'mat-1' },
    } as never);
    const user = userEvent.setup();
    renderWithQueryClient(<AddMaterialForm projectId={PROJECT_ID} />);

    await user.click(screen.getByRole('button', { name: /\+ add material/i }));

    await user.type(screen.getByPlaceholderText(/Concrete/i), 'Portland Cement');
    await user.type(screen.getByPlaceholderText('50'), '50');
    await user.type(screen.getByPlaceholderText('m³'), 'tonnes');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(addMaterial).toHaveBeenCalledWith({
        name: 'Portland Cement',
        quantity: 50,
        unit: 'tonnes',
        projectId: PROJECT_ID,
      });
    });

    // After success the form should close (the open-toggle button returns).
    expect(
      await screen.findByRole('button', { name: /\+ add material/i }),
    ).toBeInTheDocument();
  });

  it('rejects a non-positive quantity and keeps the action uncalled', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AddMaterialForm projectId={PROJECT_ID} />);

    await user.click(screen.getByRole('button', { name: /\+ add material/i }));
    await user.type(screen.getByPlaceholderText(/Concrete/i), 'X');
    await user.type(screen.getByPlaceholderText('50'), '0');
    await user.type(screen.getByPlaceholderText('m³'), 'kg');

    expect(
      await screen.findByText(/greater than zero/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    expect(addMaterial).not.toHaveBeenCalled();
  });
});
