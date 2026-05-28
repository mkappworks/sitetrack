import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateUserForm } from './CreateUserForm';

// The Server Action is invoked over the RPC wire at runtime; in tests we
// replace the module with a vi.fn() so we can drive its result + assertions.
vi.mock('../../../lib/actions/user.actions', () => ({
  createUser: vi.fn(),
}));

import { createUser } from '../../../lib/actions/user.actions';

describe('CreateUserForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits valid input through the Server Action', async () => {
    vi.mocked(createUser).mockResolvedValue({ ok: true } as never);
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/name/i), 'Sarah Chen');
    await user.type(screen.getByLabelText(/email/i), 'sarah@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correctHorse42');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(createUser).toHaveBeenCalledWith({
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        password: 'correctHorse42',
        role: 'VIEWER',
      });
    });
  });

  it('shows the per-field Zod error and does NOT submit when the email is invalid', async () => {
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/name/i), 'Sarah Chen');
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'correctHorse42');

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();

    // Submit button stays disabled while form is invalid (form.Subscribe → canSubmit).
    const submit = screen.getByRole('button', { name: /create user/i });
    expect(submit).toBeDisabled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('renders the server error returned by the Server Action', async () => {
    vi.mocked(createUser).mockResolvedValue({
      ok: false,
      error: 'That email is already in use.',
    } as never);
    const user = userEvent.setup();
    render(<CreateUserForm />);

    await user.type(screen.getByLabelText(/name/i), 'Sarah Chen');
    await user.type(screen.getByLabelText(/email/i), 'sarah@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correctHorse42');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    expect(
      await screen.findByText(/that email is already in use/i),
    ).toBeInTheDocument();
  });
});
