import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route';

const mockClearSessionCookie = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/auth', () => ({
  clearSessionCookie: mockClearSessionCookie,
}));

describe('/api/auth/logout POST', () => {
  it('clears the session cookie and responds ok', async () => {
    const res = await POST();

    expect(mockClearSessionCookie).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
