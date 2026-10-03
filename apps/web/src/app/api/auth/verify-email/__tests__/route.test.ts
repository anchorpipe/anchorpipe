import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockValidateRequest = vi.hoisted(() => vi.fn());
const mockVerifyUserEmail = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '127.0.0.1', userAgent: 'vitest' }))
);
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

vi.mock('@/lib/server/email-verification', () => ({
  verifyUserEmail: mockVerifyUserEmail,
}));

vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: {
    loginFailure: 'loginFailure',
    configUpdated: 'configUpdated',
  },
  AUDIT_SUBJECTS: {
    security: 'security',
    user: 'user',
  },
  extractRequestContext: mockExtractRequestContext,
  writeAuditLog: mockWriteAuditLog,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

describe('/api/auth/verify-email POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRequest.mockResolvedValue({ success: true, data: { token: 'token-123' } });
    mockVerifyUserEmail.mockResolvedValue({ success: true, userId: 'user-1' });
  });

  it('validates request body', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const res = await POST(
      buildNextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(400);
    expect(mockVerifyUserEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when verification fails', async () => {
    mockVerifyUserEmail.mockResolvedValueOnce({ success: false, error: 'invalid token' });

    const res = await POST(
      buildNextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'bad' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid token' });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'loginFailure' })
    );
  });

  it('returns success when verification passes', async () => {
    const res = await POST(
      buildNextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'good' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: 'Email address verified successfully.',
      verified: true,
    });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'configUpdated', subjectId: 'user-1' })
    );
  });

  it('logs and returns 500 on unexpected errors', async () => {
    mockVerifyUserEmail.mockRejectedValueOnce(new Error('db down'));

    const res = await POST(
      buildNextRequest('http://localhost/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'boom' }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error processing email verification',
      expect.objectContaining({ error: 'db down' })
    );
  });
});
