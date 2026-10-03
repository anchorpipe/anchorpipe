import { describe, beforeEach, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockRequestDataDeletion = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  }))
);

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/dsr-service', () => ({
  requestDataDeletion: mockRequestDataDeletion,
}));

vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: mockExtractRequestContext,
}));

const buildRequest = (body?: unknown) =>
  buildNextRequest('http://localhost/api/dsr/deletion', {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

describe('/api/dsr/deletion POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-123' });
    mockRequestDataDeletion.mockResolvedValue({
      id: 'dsr-1',
      status: 'pending',
      requestedAt: '2024-01-01',
      processedAt: null,
      dueAt: '2024-02-01',
      confirmationSentAt: null,
      metadata: { reason: 'testing' },
    });
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await POST(buildRequest());

    expect(res.status).toBe(401);
    expect(mockRequestDataDeletion).not.toHaveBeenCalled();
  });

  it('validates the request body', async () => {
    const res = await POST(buildRequest({ reason: 123 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Invalid request' });
    expect(mockRequestDataDeletion).not.toHaveBeenCalled();
  });

  it('creates a deletion request', async () => {
    const res = await POST(buildRequest({ reason: 'please delete' }));

    expect(res.status).toBe(200);
    expect(mockRequestDataDeletion).toHaveBeenCalledWith(
      'user-123',
      'please delete',
      mockExtractRequestContext.mock.results[0].value
    );
    expect(await res.json()).toEqual({
      requestId: 'dsr-1',
      status: 'pending',
      requestedAt: '2024-01-01',
      processedAt: null,
      dueAt: '2024-02-01',
      confirmationSentAt: null,
      metadata: { reason: 'testing' },
    });
  });

  it('returns 500 when the service fails', async () => {
    mockRequestDataDeletion.mockRejectedValueOnce(new Error('queue down'));

    const res = await POST(buildRequest());

    expect(res.status).toBe(500);
  });
});
