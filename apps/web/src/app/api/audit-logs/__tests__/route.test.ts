import { describe, beforeEach, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from '../route';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockUserHasAdminRole = vi.hoisted(() => vi.fn());
const mockListAuditLogs = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/rbac-service', () => ({
  userHasAdminRole: mockUserHasAdminRole,
}));

vi.mock('@/lib/server/audit-service', () => ({
  listAuditLogs: mockListAuditLogs,
}));

const buildRequest = (query?: string) =>
  ({
    nextUrl: new URL(`http://localhost/api/audit-logs${query ? `?${query}` : ''}`),
  }) as unknown as NextRequest;

describe('/api/audit-logs GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockUserHasAdminRole.mockResolvedValue(true);
    mockListAuditLogs.mockResolvedValue([{ id: 'log-1' }]);
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await GET(buildRequest());

    expect(res.status).toBe(401);
  });

  it('requires admin role', async () => {
    mockUserHasAdminRole.mockResolvedValueOnce(false);

    const res = await GET(buildRequest());

    expect(res.status).toBe(403);
  });

  it('returns audit logs with default pagination settings', async () => {
    const res = await GET(buildRequest());

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith({
      limit: 50,
      subject: undefined,
      actorId: undefined,
      cursor: undefined,
    });
    expect(await res.json()).toEqual({ data: [{ id: 'log-1' }] });
  });

  it('clamps limit to between 1 and 200', async () => {
    await GET(buildRequest('limit=500'));
    expect(mockListAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 200,
      })
    );

    await GET(buildRequest('limit=0'));
    expect(mockListAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        limit: 1,
      })
    );
  });

  it('propagates filters from the query string', async () => {
    const res = await GET(buildRequest('subject=security&actorId=user-9&cursor=abc123&limit=25'));

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith({
      limit: 25,
      subject: 'security',
      actorId: 'user-9',
      cursor: 'abc123',
    });
  });

  it('returns 500 when listing fails', async () => {
    mockListAuditLogs.mockRejectedValueOnce(new Error('db down'));

    const res = await GET(buildRequest());

    expect(res.status).toBe(500);
  });
});

