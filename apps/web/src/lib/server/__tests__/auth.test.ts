import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
}));

import {
  clearSessionCookie,
  createSessionJwt,
  readSession,
  setSessionCookie,
  verifySessionJwt,
} from '../auth';

describe('auth service', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    cookieStore.set.mockReset();
    cookieStore.delete.mockReset();
    cookieStore.get.mockReset();
    vi.stubEnv('AUTH_SECRET', 'test-secret-key-123456');
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates and verifies JWT payloads', async () => {
    const token = await createSessionJwt({ sub: 'user-123' }, 60);
    const payload = await verifySessionJwt(token);
    expect(payload).toMatchObject({ sub: 'user-123' });
    expect(typeof payload?.exp).toBe('number');
  });

  it('returns null for tampered tokens', async () => {
    const token = await createSessionJwt({ sub: 'user-456' }, 60);
    const badToken = `${token}corrupted`;
    const payload = await verifySessionJwt(badToken);
    expect(payload).toBeNull();
  });

  it('sets, reads, and clears the session cookie via Next cookies API', async () => {
    const sessionToken = await createSessionJwt({ sub: 'user-789' }, 60);
    cookieStore.get.mockReturnValueOnce({ value: sessionToken });

    await setSessionCookie(sessionToken);
    expect(cookieStore.set).toHaveBeenCalledWith(
      'ap_session',
      sessionToken,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
      })
    );

    const payload = await readSession();
    expect(payload).toMatchObject({ sub: 'user-789' });

    await clearSessionCookie();
    expect(cookieStore.delete).toHaveBeenCalledWith('ap_session');
  });
});

