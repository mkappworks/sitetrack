import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gqlFetch } from './client';
import { getSession } from 'next-auth/react';

// jsdom provides `window`, so gqlFetch takes the client-side retry path.
describe('gqlFetch client-side 401 retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes the session and retries once with the fresh token on an auth error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }],
        }),
      })
      .mockResolvedValueOnce({ json: async () => ({ data: { ok: true } }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(getSession).mockResolvedValue({ accessToken: 'fresh-token' } as never);

    const data = await gqlFetch('query {}', undefined, 'stale-token');

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondHeaders = (fetchMock.mock.calls[1][1] as { headers: Record<string, string> }).headers;
    expect(secondHeaders.Authorization).toBe('Bearer fresh-token');
  });

  it('does NOT retry when the refreshed token is unchanged (real auth failure)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(getSession).mockResolvedValue({ accessToken: 'stale-token' } as never);

    await expect(gqlFetch('q', undefined, 'stale-token')).rejects.toThrow('Unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT refresh or retry on a non-auth error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ errors: [{ message: 'Validation failed' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(gqlFetch('q', undefined, 'tok')).rejects.toThrow('Validation failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSession).not.toHaveBeenCalled();
  });
});
