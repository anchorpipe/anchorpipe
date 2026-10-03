import { describe, beforeEach, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockProcessEmailQueue = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/email-queue-processor', () => ({
  processEmailQueue: mockProcessEmailQueue,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

const buildRequest = (query?: string) =>
  buildNextRequest(`http://localhost/api/admin/email-queue/process${query ? `?${query}` : ''}`, {
    method: 'POST',
  });

describe('/api/admin/email-queue/process POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockReadSession.mockResolvedValue({ sub: 'admin-user' });
    mockProcessEmailQueue.mockResolvedValue({ processed: 5, failed: 1 });
  });

  it('rejects unauthenticated requests', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(mockProcessEmailQueue).not.toHaveBeenCalled();
  });

  it('processes queue with default batch size', async () => {
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      processed: 5,
      failed: 1,
      batchSize: 10,
    });
    expect(mockProcessEmailQueue).toHaveBeenCalledWith(10);
  });

  it('allows overriding the batch size via query param', async () => {
    const response = await POST(buildRequest('batchSize=25'));

    expect(response.status).toBe(200);
    expect(mockProcessEmailQueue).toHaveBeenCalledWith(25);
    const body = await response.json();
    expect(body.batchSize).toBe(25);
  });

  it('returns 500 when processing fails', async () => {
    mockProcessEmailQueue.mockRejectedValueOnce(new Error('queue offline'));

    const response = await POST(buildRequest());

    expect(response.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error processing email queue',
      expect.objectContaining({ error: 'queue offline' })
    );
  });
});
