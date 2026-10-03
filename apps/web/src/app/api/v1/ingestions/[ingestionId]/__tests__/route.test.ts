import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNextRequest } from '@/test-utils/build-next-request';
import { GET } from '../route';

const mockAuthenticateV1HmacRequest = vi.hoisted(() => vi.fn());
const mockRepoFindUnique = vi.hoisted(() => vi.fn());
const mockReceiptFindFirst = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('@/lib/server/hmac-auth', () => ({
  authenticateV1HmacRequest: mockAuthenticateV1HmacRequest,
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    repo: { findUnique: mockRepoFindUnique },
    ingestionReceipt: { findFirst: mockReceiptFindFirst },
  },
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

function request() {
  return buildNextRequest('http://localhost/api/v1/ingestions/receipt-1');
}

function params(ingestionId = 'receipt-1') {
  return { params: Promise.resolve({ ingestionId }) };
}

function authorize() {
  mockAuthenticateV1HmacRequest.mockResolvedValue({
    success: true,
    repoId: 'repo-1',
    secretId: 'secret-1',
  });
  mockRepoFindUnique.mockResolvedValue({ tenantId: 'tenant-a' });
}

describe('/api/v1/ingestions/[ingestionId] GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorize();
  });

  it('rejects an unauthenticated status request with 401', async () => {
    mockAuthenticateV1HmacRequest.mockResolvedValueOnce({
      success: false,
      error: 'Invalid HMAC signature',
    });

    const response = await GET(request(), params());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication failed.' },
    });
    expect(mockRepoFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a repository without a tenant with 403', async () => {
    mockRepoFindUnique.mockResolvedValueOnce({ tenantId: null });

    const response = await GET(request(), params());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: 'FORBIDDEN', message: 'Repository is not assigned to a tenant.' },
    });
    expect(mockReceiptFindFirst).not.toHaveBeenCalled();
  });

  it('scopes status lookup to the authenticated repository and tenant', async () => {
    mockReceiptFindFirst.mockResolvedValueOnce(null);

    const response = await GET(request(), params('missing-receipt'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'RECEIPT_NOT_FOUND', message: 'Ingestion receipt was not found.' },
    });
    expect(mockReceiptFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-receipt',
        tenantId: 'tenant-a',
        repoId: 'repo-1',
      },
      select: {
        id: true,
        status: true,
        receivedAt: true,
        createdAt: true,
      },
    });
  });

  it('returns the documented status response shape for an authorized receipt', async () => {
    const receivedAt = new Date('2026-01-01T00:00:00.000Z');
    const createdAt = new Date('2026-01-01T00:01:00.000Z');
    mockReceiptFindFirst.mockResolvedValueOnce({
      id: 'receipt-1',
      status: 'processing',
      receivedAt,
      createdAt,
    });

    const response = await GET(request(), params());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ingestionId: 'receipt-1',
      state: 'processing',
      statusUrl: '/api/v1/ingestions/receipt-1',
      receivedAt: receivedAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  });

  it('maps status persistence failures to 503', async () => {
    mockReceiptFindFirst.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await GET(request(), params());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: 'INGESTION_UNAVAILABLE',
        message: 'Ingestion status is temporarily unavailable.',
      },
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected v1 ingestion status error',
      expect.objectContaining({ error: 'database unavailable' })
    );
  });
});
