import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GET, POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockUserHasAdminRole = vi.hoisted(() => vi.fn());
const mockForwardAuditLogsToSiem = vi.hoisted(() => vi.fn());
const mockTestConnection = vi.hoisted(() => vi.fn());
const mockGetSiemForwarder = vi.hoisted(() =>
  vi.fn(() => ({ testConnection: mockTestConnection }))
);
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

vi.mock('@/lib/server/siem-forwarder', () => ({
  forwardAuditLogsToSiem: mockForwardAuditLogsToSiem,
  getSiemForwarder: mockGetSiemForwarder,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

const buildPostRequest = (query?: string) =>
  buildNextRequest(`http://localhost/api/admin/siem/forward${query ? `?${query}` : ''}`, {
    method: 'POST',
  });

const buildGetRequest = () =>
  buildNextRequest('http://localhost/api/admin/siem/forward', { method: 'GET' });

describe('/api/admin/siem/forward POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockTestConnection.mockReset();
    mockGetSiemForwarder.mockReset();
    mockGetSiemForwarder.mockReturnValue({ testConnection: mockTestConnection });
    mockReadSession.mockResolvedValue({ sub: 'admin-1' });
    mockUserHasAdminRole.mockResolvedValue(true);
    mockForwardAuditLogsToSiem.mockResolvedValue({ success: 4, failed: 0, errors: [] });
    mockTestConnection.mockResolvedValue({ success: true, error: null });
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await POST(buildPostRequest());

    expect(res.status).toBe(401);
    expect(mockForwardAuditLogsToSiem).not.toHaveBeenCalled();
  });

  it('requires admin privileges', async () => {
    mockUserHasAdminRole.mockResolvedValueOnce(false);

    const res = await POST(buildPostRequest());

    expect(res.status).toBe(403);
    expect(mockForwardAuditLogsToSiem).not.toHaveBeenCalled();
  });

  it('forwards logs using default batch size', async () => {
    const res = await POST(buildPostRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      processed: 4,
      failed: 0,
      errors: [],
    });
    expect(mockForwardAuditLogsToSiem).toHaveBeenCalledWith(undefined);
  });

  it('honors batchSize overrides', async () => {
    const res = await POST(buildPostRequest('batchSize=50'));

    expect(res.status).toBe(200);
    expect(mockForwardAuditLogsToSiem).toHaveBeenCalledWith(50);
  });

  it('returns 500 when forwarding fails', async () => {
    mockForwardAuditLogsToSiem.mockRejectedValueOnce(new Error('siem offline'));

    const res = await POST(buildPostRequest());

    expect(res.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error forwarding audit logs to SIEM',
      expect.objectContaining({ error: 'siem offline' })
    );
  });
});

describe('/api/admin/siem/forward GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockTestConnection.mockReset();
    mockGetSiemForwarder.mockReset();
    mockGetSiemForwarder.mockReturnValue({ testConnection: mockTestConnection });
    mockReadSession.mockResolvedValue({ sub: 'admin-2' });
    mockUserHasAdminRole.mockResolvedValue(true);
    mockTestConnection.mockResolvedValue({ success: true, error: null });
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await GET(buildGetRequest());

    expect(res.status).toBe(401);
  });

  it('requires admin privileges', async () => {
    mockUserHasAdminRole.mockResolvedValueOnce(false);

    const res = await GET(buildGetRequest());

    expect(res.status).toBe(403);
  });

  it('returns SIEM connection status', async () => {
    const res = await GET(buildGetRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null });
  });

  it('handles test connection failures', async () => {
    mockTestConnection.mockRejectedValueOnce(new Error('timeout'));

    const res = await GET(buildGetRequest());

    expect(res.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error testing SIEM connection',
      expect.objectContaining({ error: 'timeout' })
    );
  });
});
