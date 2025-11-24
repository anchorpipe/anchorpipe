import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const mockReadSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

const mockRequestDataExport = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/dsr-service', () => ({
  requestDataExport: mockRequestDataExport,
}));

const mockExtractRequestContext = vi.hoisted(() => vi.fn(() => ({ ipAddress: '127.0.0.1' })));
vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: mockExtractRequestContext,
}));

const buildRequest = () =>
  new NextRequest('http://localhost/api/dsr/export', {
    method: 'POST',
  });

describe('/api/dsr/export POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockReadSession.mockResolvedValue(null);

    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mockRequestDataExport).not.toHaveBeenCalled();
  });

  it('returns export request data when successful', async () => {
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    const dsrRecord = {
      id: 'dsr-1',
      status: 'completed',
      requestedAt: new Date('2023-01-01T00:00:00.000Z'),
      processedAt: new Date('2023-01-02T00:00:00.000Z'),
      dueAt: new Date('2023-01-03T00:00:00.000Z'),
      confirmationSentAt: new Date('2023-01-04T00:00:00.000Z'),
    };
    mockRequestDataExport.mockResolvedValue(dsrRecord);

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      requestId: 'dsr-1',
      status: 'completed',
      requestedAt: dsrRecord.requestedAt.toISOString(),
      processedAt: dsrRecord.processedAt.toISOString(),
      dueAt: dsrRecord.dueAt.toISOString(),
      confirmationSentAt: dsrRecord.confirmationSentAt.toISOString(),
    });
    expect(mockRequestDataExport).toHaveBeenCalledWith('user-1', { ipAddress: '127.0.0.1' });
  });

  it('returns 500 when requestDataExport throws', async () => {
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockRequestDataExport.mockRejectedValue(new Error('db down'));

    const response = await POST(buildRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});

