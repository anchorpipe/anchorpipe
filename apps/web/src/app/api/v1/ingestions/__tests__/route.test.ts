import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNextRequest } from '@/test-utils/build-next-request';
import { IngestionContractError } from '@anchorpipe/ingestion';
import { ReceiptPersistenceError } from '@/lib/server/v1-ingestion-adapter';
import { POST } from '../route';

const mockAuthenticateV1HmacRequest = vi.hoisted(() => vi.fn());
const mockReceiptAccept = vi.hoisted(() => vi.fn());
const mockObjectPut = vi.hoisted(() => vi.fn());
const mockRepoFindUnique = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
}));
const mockContextFromHmac = vi.hoisted(() =>
  vi.fn(
    ({
      tenantId,
      repoId,
      secretId,
    }: {
      tenantId: string | null;
      repoId: string;
      secretId?: string;
    }) => {
      if (!tenantId) {
        throw new IngestionContractError(
          'FORBIDDEN',
          'Repository is not assigned to a tenant.',
          403
        );
      }
      return { tenantId, repoId, credentialId: secretId || 'legacy-hmac' };
    }
  )
);
const MockPostgresIngestionReceiptPort = vi.hoisted(
  () =>
    class MockPostgresIngestionReceiptPort {
      accept = mockReceiptAccept;
    }
);
const MockReceiptPersistenceError = vi.hoisted(
  () =>
    class MockReceiptPersistenceError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ReceiptPersistenceError';
      }
    }
);

vi.mock('@/lib/server/hmac-auth', () => ({
  authenticateV1HmacRequest: mockAuthenticateV1HmacRequest,
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    repo: { findUnique: mockRepoFindUnique },
  },
}));

vi.mock('@/lib/server/v1-ingestion-adapter', () => ({
  contextFromHmac: mockContextFromHmac,
  ingestionObjectPort: { put: mockObjectPut },
  PostgresIngestionReceiptPort: MockPostgresIngestionReceiptPort,
  ReceiptPersistenceError: MockReceiptPersistenceError,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

const envelope = JSON.stringify({
  schema_version: 'test-report.v1',
  event_id: 'event-1',
  source: 'github-actions',
  occurred_at: '2026-01-01T00:00:00.000Z',
  run: {
    provider_run_id: 'run-1',
    attempt: 1,
    commit_sha: 'a'.repeat(40),
    ref: 'refs/heads/main',
    framework: 'vitest',
  },
  content: { media_type: 'application/json' },
});

function buildRequest(body = envelope, headers: Record<string, string> = {}) {
  return buildNextRequest('http://localhost/api/v1/ingestions', {
    method: 'POST',
    body,
    headers,
  });
}

function authorize() {
  mockAuthenticateV1HmacRequest.mockResolvedValue({
    success: true,
    repoId: 'repo-1',
    secretId: 'secret-1',
  });
  mockRepoFindUnique.mockResolvedValue({ id: 'repo-1', tenantId: 'tenant-a' });
}

const acceptedReceipt = {
  ingestionId: 'receipt-1',
  state: 'accepted',
  statusUrl: '/api/v1/ingestions/receipt-1',
  duplicate: false,
};

describe('/api/v1/ingestions POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObjectPut.mockResolvedValue(undefined);
    mockReceiptAccept.mockResolvedValue(acceptedReceipt);
    authorize();
  });

  it('rejects a request without an idempotency key', async () => {
    const response = await POST(buildRequest(envelope, { 'content-type': 'application/json' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'The Idempotency-Key header is required.',
      },
    });
    expect(mockAuthenticateV1HmacRequest).not.toHaveBeenCalled();
  });

  it('rejects unsupported media types before persisting the object', async () => {
    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'text/plain',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Only application/json is supported.' },
    });
    expect(mockObjectPut).not.toHaveBeenCalled();
    expect(mockReceiptAccept).not.toHaveBeenCalled();
  });

  it('rejects malformed envelopes with the stable contract error shape', async () => {
    const response = await POST(
      buildRequest('{}', {
        'content-type': 'application/json',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'INVALID_ENVELOPE', message: 'Ingestion envelope is invalid.' },
    });
    expect(mockObjectPut).not.toHaveBeenCalled();
    expect(mockReceiptAccept).not.toHaveBeenCalled();
  });

  it('maps authentication failure to 401', async () => {
    mockAuthenticateV1HmacRequest.mockResolvedValueOnce({
      success: false,
      error: 'Invalid v1 HMAC credentials',
    });

    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'application/json',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication failed.' },
    });
    expect(mockRepoFindUnique).not.toHaveBeenCalled();
  });

  it('maps a repository tenant ownership mismatch to 403', async () => {
    mockReceiptAccept.mockRejectedValueOnce(
      new IngestionContractError('FORBIDDEN', 'Repository is not owned by this tenant.', 403)
    );

    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'application/json',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: { code: 'FORBIDDEN', message: 'Repository is not owned by this tenant.' },
    });
  });

  it('returns the same receipt as a 202 duplicate replay', async () => {
    mockReceiptAccept.mockResolvedValueOnce({ ...acceptedReceipt, duplicate: true });

    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'application/json',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ...acceptedReceipt, duplicate: true });
  });

  it('maps an idempotency hash conflict to 409', async () => {
    mockReceiptAccept.mockRejectedValueOnce(
      new IngestionContractError(
        'IDEMPOTENCY_CONFLICT',
        'The idempotency key was already used for a different request.',
        409
      )
    );

    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'application/json',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'The idempotency key was already used for a different request.',
      },
    });
  });

  it('returns the documented 202 receipt response shape', async () => {
    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'application/json; charset=utf-8',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(acceptedReceipt);
    expect(mockObjectPut).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'application/json',
        bytes: expect.any(Uint8Array),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      })
    );
    expect(mockReceiptAccept).toHaveBeenCalledWith(
      expect.objectContaining({
        clientKey: 'client-key-1',
        requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        context: { tenantId: 'tenant-a', repoId: 'repo-1', credentialId: 'secret-1' },
      })
    );
  });

  it('maps receipt persistence failures to 503', async () => {
    mockReceiptAccept.mockRejectedValueOnce(
      new ReceiptPersistenceError('Unable to durably accept the ingestion request.')
    );

    const response = await POST(
      buildRequest(envelope, {
        'content-type': 'application/json',
        'idempotency-key': 'client-key-1',
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: 'RECEIPT_UNAVAILABLE',
        message: 'Unable to durably accept the ingestion request.',
      },
    });
  });
});
