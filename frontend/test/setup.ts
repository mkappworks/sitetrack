import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// next-auth/react's useSession reads from a context provider we don't mount
// in tests. Stub it with a non-admin authenticated session by default;
// individual tests can override per-test with vi.mocked(useSession).
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com', role: 'VIEWER' },
      accessToken: 'test-token',
      expires: '2099-01-01',
    },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));
