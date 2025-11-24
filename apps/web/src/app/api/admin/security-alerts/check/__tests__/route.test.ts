import { describe, beforeEach, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockUserHasAdminRole = vi.hoisted(() => vi.fn());
const mockCheckPatterns = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/rbac-service', () => ({
  userHasAdminRole: mockUserHasAdminRole,
}));

vi.mock('@/lib/server/security-alerts', () => ({
  checkAndAlertSuspiciousPatterns: mockCheckPatterns,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

describe('/api/admin/security-alerts/check POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockReadSession.mockResolvedValue({ sub: 'admin-1' });
    mockUserHasAdminRole.mockResolvedValue(true);
    mockCheckPatterns.mockResolvedValue({ matched: 2, alertsSent: 1 });
  });

  it('denies unauthenticated requests', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await POST(
      buildNextRequest('http://localhost/api/admin/security-alerts/check', { method: 'POST' })
    );

    expect(res.status).toBe(401);
    expect(mockUserHasAdminRole).not.toHaveBeenCalled();
  });

  it('requires admin role', async () => {
    mockUserHasAdminRole.mockResolvedValueOnce(false);

    const res = await POST(
      buildNextRequest('http://localhost/api/admin/security-alerts/check', { method: 'POST' })
    );

    expect(res.status).toBe(403);
    expect(mockCheckPatterns).not.toHaveBeenCalled();
  });

  it('triggers security pattern detection', async () => {
    const res = await POST(
      buildNextRequest('http://localhost/api/admin/security-alerts/check', { method: 'POST' })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: 'Security pattern detection completed',
      matched: 2,
      alertsSent: 1,
    });
    expect(mockCheckPatterns).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when detection fails', async () => {
    mockCheckPatterns.mockRejectedValueOnce(new Error('scanner offline'));

    const res = await POST(
      buildNextRequest('http://localhost/api/admin/security-alerts/check', { method: 'POST' })
    );

    expect(res.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to check security patterns',
      expect.objectContaining({ error: 'scanner offline' })
    );
  });
});
