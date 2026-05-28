import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectButton } from './CreateProjectButton';
import { renderWithQueryClient } from '../test/test-utils';

vi.mock('../lib/actions/project.actions', () => ({
  createProject: vi.fn(),
}));

import { createProject } from '../lib/actions/project.actions';

describe('CreateProjectButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the modal when the "+ New project" button is clicked', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CreateProjectButton />);

    expect(screen.queryByText(/^New project$/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /\+ new project/i }));
    expect(screen.getByText(/^New project$/)).toBeInTheDocument();
  });

  it('submits valid input through the Server Action and closes the modal', async () => {
    vi.mocked(createProject).mockResolvedValue({
      ok: true,
      data: { id: 'project-uuid' },
    } as never);
    const user = userEvent.setup();
    renderWithQueryClient(<CreateProjectButton />);

    await user.click(screen.getByRole('button', { name: /\+ new project/i }));

    await user.type(screen.getByLabelText(/project name/i), 'Riverside Tower');
    await user.type(screen.getByLabelText(/description/i), 'Phase 2 work');
    await user.type(screen.getByLabelText(/location/i), 'Vancouver, BC');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        name: 'Riverside Tower',
        description: 'Phase 2 work',
        location: 'Vancouver, BC',
        status: 'PLANNING',
        managerId: '',
      });
    });

    // Modal should close on success — header text no longer in document.
    await waitFor(() => {
      expect(screen.queryByText(/^New project$/)).not.toBeInTheDocument();
    });
  });

  it('keeps submit disabled while name is below the Zod min length', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CreateProjectButton />);
    await user.click(screen.getByRole('button', { name: /\+ new project/i }));

    await user.type(screen.getByLabelText(/project name/i), 'No');
    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeDisabled();
    expect(createProject).not.toHaveBeenCalled();
  });
});
