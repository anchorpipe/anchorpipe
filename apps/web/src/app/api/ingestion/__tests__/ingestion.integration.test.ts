import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { POST } from '../route';
import { middleware } from '@/middleware';
import {
  buildJsonRequest,
  createIngestionPayload,
  readJson,
} from '../../__tests__/integration-test-helpers';

const mockAuthenticate = vi.hoisted(() => vi.fn());
const mockProcessIngestion = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/hmac-auth', () => ({
  authenticateHmacRequest: mockAuthenticate,
}));

vi.mock('@/lib/server/ingestion-service', () => ({
  processIngestion: mockProcessIngestion,
}));

vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: vi.fn().mockReturnValue({
    ipAddress: '203.0.113.10',
    userAgent: 'vitest',
  }),
}));

const rateLimitCounts = new Map<string, number>();
const RATE_LIMIT_MAX = 100;

vi.mock('@/lib/server/rate-limit', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/server/rate-limit')>('@/lib/server/rate-limit');

  return {
    ...actual,
    checkRateLimit: vi.fn(async (key: string) => {
      const total = (rateLimitCounts.get(key) ?? 0) + 1;
      rateLimitCounts.set(key, total);
      if (total > RATE_LIMIT_MAX) {
        throw new actual.RateLimitError('Too many requests', 60);
      }
    }),
    getRateLimitInfo: vi.fn(async (key: string) => ({
      limit: RATE_LIMIT_MAX,
      remaining: Math.max(RATE_LIMIT_MAX - (rateLimitCounts.get(key) ?? 0), 0),
      reset: Date.now() + 60_000,
    })),
  };
});

const globalWithCrypto = globalThis as typeof globalThis & { crypto?: Crypto };
if (!globalWithCrypto.crypto) {
  globalWithCrypto.crypto = webcrypto as Crypto;
}

async function parseResponse<T>(response: NextResponse): Promise<T> {
  return readJson<T>(response);
}

describe('POST /api/ingestion - Full Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCounts.clear();
    mockAuthenticate.mockReset();
    mockProcessIngestion.mockReset();
  });

  describe('Authentication', () => {
    it('should reject without HMAC', async () => {
      mockAuthenticate.mockResolvedValueOnce({
        success: false,
        error: 'Missing X-FR-Sig header',
      });

      const payload = createIngestionPayload();
      const request = buildJsonRequest('/api/ingestion', { body: payload });

      const response = await POST(request);
      const body = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(401);
      expect(body.error).toContain('Missing X-FR-Sig header');
      expect(mockProcessIngestion).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should reject payloads that mismatch repo id', async () => {
      const payload = createIngestionPayload({
        repo_id: '11111111-1111-1111-8888-111111111111',
      });
      mockAuthenticate.mockResolvedValueOnce({
        success: true,
        repoId: '22222222-2222-2222-9999-222222222222',
      });

      const request = buildJsonRequest('/api/ingestion', { body: payload });
      const response = await POST(request);
      const body = await parseResponse<{ error: string }>(response);

      expect(response.status).toBe(403);
      expect(body.error).toBe('Repository ID mismatch');
      expect(mockProcessIngestion).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency', () => {
    it('should return isDuplicate: true on duplicate submissions', async () => {
      const payload = createIngestionPayload();
      mockAuthenticate.mockResolvedValue({
        success: true,
        repoId: payload.repo_id as string,
      });
      mockProcessIngestion.mockResolvedValueOnce({
        success: true,
        runId: payload.run_id,
        message: 'Test report received (duplicate)',
        summary: { tests_parsed: payload.tests?.length ?? 0, flaky_candidates: 0 },
        isDuplicate: true,
      });

      const request = buildJsonRequest('/api/ingestion', { body: payload });
      const response = await POST(request);
      const body = await parseResponse<{
        runId: string;
        isDuplicate?: boolean;
      }>(response);

      expect(response.status).toBe(200);
      expect(body.runId).toBe(payload.run_id);
      expect(body.isDuplicate).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce limits', async () => {
      const requestFactory = () =>
        buildJsonRequest('/api/ingestion', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '198.51.100.1',
          },
          body: createIngestionPayload(),
        });

      // First 100 requests succeed
      for (let i = 0; i < RATE_LIMIT_MAX; i++) {
        const response = await middleware(requestFactory());
        expect(response.status).toBe(200);
      }

      // 101st request is rejected
      const blocked = await middleware(requestFactory());
      const body = await parseResponse<{ error: { code: string } }>(blocked);

      expect(blocked.status).toBe(429);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Response headers', () => {
    it('should include security and rate-limit headers for successful ingestions', async () => {
      const payload = createIngestionPayload();
      mockAuthenticate.mockResolvedValue({
        success: true,
        repoId: payload.repo_id as string,
      });
      mockProcessIngestion.mockResolvedValue({
        success: true,
        runId: payload.run_id,
        message: 'Test report received',
        summary: { tests_parsed: payload.tests?.length ?? 0, flaky_candidates: 0 },
      });

      const middlewareRequest = buildJsonRequest('/api/ingestion', {
        headers: { 'x-forwarded-for': '203.0.113.50' },
      });
      const middlewareResponse = await middleware(middlewareRequest);

      expect(middlewareResponse.headers.get('content-security-policy')).toContain('default-src');
      expect(middlewareResponse.headers.get('X-RateLimit-Limit')).toBe(String(RATE_LIMIT_MAX));
      expect(middlewareResponse.headers.get('x-request-id')).toBeTruthy();

      const routeRequest = buildJsonRequest('/api/ingestion', { body: payload });
      const routeResponse = await POST(routeRequest);
      const body = await parseResponse<{ runId: string; isDuplicate?: boolean }>(routeResponse);

      expect(routeResponse.headers.get('content-type')).toContain('application/json');
      expect(body.runId).toBe(payload.run_id);
      expect(body.isDuplicate).toBeUndefined();
    });
  });
});
