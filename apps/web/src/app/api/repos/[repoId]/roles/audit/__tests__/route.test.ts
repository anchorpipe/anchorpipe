import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockRequireAuthz = vi.hoisted(() => vi.fn());
const mockGetRoleAuditLogs = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/authz', () => ({
  requireAuthz: mockRequireAuthz,
}));

vi.mock('@/lib/server/rbac-service', () => ({
  getRoleAuditLogs: mockGetRoleAuditLogs,
}));

const buildRequest = (limit?: string) =>
  buildNextRequest(
    `http://localhost/api/repos/repo-1/roles/audit${limit ? `?limit=${limit}` : ''}`,
    { method: 'GET' }
  );

const params = Promise.resolve({ repoId: 'repo-1' });

describe('/api/repos/[repoId]/roles/audit GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthz.mockResolvedValue({ userId: 'admin-1' });
    mockGetRoleAuditLogs.mockResolvedValue([{ id: 'log-1' }]);
  });

  it('returns audit logs with default limit', async () => {
    const res = await GET(buildRequest(), { params });

    expect(res.status).toBe(200);
    expect(mockGetRoleAuditLogs).toHaveBeenCalledWith('repo-1', 50);
    expect(await res.json()).toEqual({ logs: [{ id: 'log-1' }] });
  });

  it('passes through limit query parameter', async () => {
    await GET(buildRequest('25'), { params });

    expect(mockGetRoleAuditLogs).toHaveBeenCalledWith('repo-1', 25);
  });

  it('propagates auth errors to HTTP responses', async () => {
    mockRequireAuthz.mockRejectedValueOnce(new Error('Forbidden'));

    const res = await GET(buildRequest(), { params });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});
