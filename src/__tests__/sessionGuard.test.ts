import { describe, it, expect, vi } from 'vitest';
import { ensureFreshSession, SessionAuthClient } from '../lib/sessionGuard';

function makeClient(overrides: Partial<SessionAuthClient['auth']> = {}): SessionAuthClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: { message: 'not implemented' } }),
      ...overrides,
    },
  };
}

describe('ensureFreshSession', () => {
  it('returns true when the session is still valid for more than 60s', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now + 3600 } } }),
    });

    expect(await ensureFreshSession(sb)).toBe(true);
    expect(sb.auth.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes and returns true when the session is about to expire and refresh succeeds', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now + 10 } } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now + 3600 } }, error: null }),
    });

    expect(await ensureFreshSession(sb)).toBe(true);
    expect(sb.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('returns false when the session is about to expire and refresh fails', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now - 10 } } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: { message: 'invalid refresh token' } }),
    });

    expect(await ensureFreshSession(sb)).toBe(false);
  });

  it('returns false when there is no local session at all', async () => {
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    });

    expect(await ensureFreshSession(sb)).toBe(false);
    expect(sb.auth.refreshSession).not.toHaveBeenCalled();
  });
});
