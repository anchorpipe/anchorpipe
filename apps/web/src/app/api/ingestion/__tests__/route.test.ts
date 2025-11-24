import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const mockRateLimit = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/rate-limit', () => ({
  rateLimit: mockRateLimit,
}));

const mockAuthenticateRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/hmac-auth', () => ({
  authenticateHmacRequest: mockAuthenticateRequest,
}));

const mockSafeParse = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/ingestion-schema', () => ({
  IngestionPayloadSchema: {
    safeParse: mockSafeParse,
  },
}));

const mockProcessIngestion = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/ingestion-service', () => ({
  processIngestion: mockProcessIngestion,
}));

const mockLoggerWarn = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/logger', () => ({
  logger: {
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '1.1.1.1', userAgent: 'vitest' }))
);
vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: { loginFailure: 'login_failure' },
  AUDIT_SUBJECTS: { security: 'security' },
  writeAuditLog: mockWriteAuditLog,
  extractRequestContext: mockExtractRequestContext,
}));

const buildRequest = (body: string) =>
  new NextRequest('http://localhost/api/ingestion', {
    method: 'POST',
    body,
  });

const samplePayload = {
  repo_id: 'repo-123',
  reports: [],
  metadata: { branch: 'main' },
  summary: { tests_parsed: 10, flaky_candidates: 1 },
};

describe('/api/ingestion POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: { 'X-RateLimit-Remaining': '5' },
    });
    mockAuthenticateRequest.mockResolvedValue({ success: true, repoId: 'repo-123' });
    mockSafeParse.mockReturnValue({ success: true, data: samplePayload });
    mockProcessIngestion.mockResolvedValue({
      success: true,
      runId: 'run-1',
      message: 'accepted',
      summary: samplePayload.summary,
    });
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, headers: { 'Retry-After': '10' } });

    const response = await POST(buildRequest(JSON.stringify(samplePayload)));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('10');
    expect(mockAuthenticateRequest).not.toHaveBeenCalled();
  });

  it('returns 200 when ingestion succeeds', async () => {
    const response = await POST(buildRequest(JSON.stringify(samplePayload)));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      runId: 'run-1',
      message: 'accepted',
      summary: samplePayload.summary,
    });
    expect(mockAuthenticateRequest).toHaveBeenCalled();
    expect(mockProcessIngestion).toHaveBeenCalledWith(samplePayload, 'repo-123', {
      ipAddress: '1.1.1.1',
      userAgent: 'vitest',
    });
  });

  it('returns 400 when body is empty', async () => {
    const response = await POST(buildRequest(''));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Request body is required' });
  });

  it('returns 401 when authentication fails', async () => {
    mockAuthenticateRequest.mockResolvedValue({ success: false, error: 'bad sig' });

    const response = await POST(buildRequest(JSON.stringify(samplePayload)));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'bad sig' });
  });

  it('returns 400 when payload JSON is invalid', async () => {
    const response = await POST(buildRequest('{invalid json'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON payload' });
  });

  it('returns 403 when repo_id mismatch', async () => {
    mockSafeParse.mockReturnValue({
      success: true,
      data: { ...samplePayload, repo_id: 'different' },
    });

    const response = await POST(buildRequest(JSON.stringify(samplePayload)));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Repository ID mismatch' });
  });

  it('returns 500 when ingestion service fails', async () => {
    mockProcessIngestion.mockResolvedValue({ success: false, error: 'queue down' });

    const response = await POST(buildRequest(JSON.stringify(samplePayload)));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'queue down' });
  });

  it('handles unexpected errors from processing', async () => {
    mockProcessIngestion.mockRejectedValue(new Error('boom'));

    const response = await POST(buildRequest(JSON.stringify(samplePayload)));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('boom');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Ingestion error',
      expect.objectContaining({ error: 'boom' })
    );
  });
});

