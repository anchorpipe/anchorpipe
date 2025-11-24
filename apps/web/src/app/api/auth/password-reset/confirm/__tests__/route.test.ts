import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockRateLimit = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/rate-limit', () => ({
  rateLimit: mockRateLimit,
}));

const mockValidateRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

const mockResetPasswordWithToken = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/password-reset', () => ({
  resetPasswordWithToken: mockResetPasswordWithToken,
}));

const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '198.51.100.5', userAgent: 'vitest' }))
);
vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: { loginFailure: 'login_failure', configUpdated: 'config_updated' },
  AUDIT_SUBJECTS: { security: 'security', user: 'user' },
  writeAuditLog: mockWriteAuditLog,
  extractRequestContext: mockExtractRequestContext,
}));

const mockLoggerWarn = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/logger', () => ({
  logger: { info: vi.fn(), warn: mockLoggerWarn, error: mockLoggerError },
}));

const buildRequest = (body: unknown) =>
  buildNextRequest('http://localhost/api/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('/api/auth/password-reset/confirm POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, headers: {} });
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { token: 'abc', password: 'StrongKey1!' },
    });
    mockResetPasswordWithToken.mockResolvedValue({ success: true });
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resets password when token valid', async () => {
    const response = await POST(buildRequest({ token: 'abc', password: 'StrongKey1!' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('Password has been reset successfully');
    expect(mockResetPasswordWithToken).toHaveBeenCalledWith('abc', 'StrongKey1!');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'config_updated',
        subject: 'user',
      })
    );
  });

  it('returns 400 when validation fails', async () => {
    mockValidateRequest.mockResolvedValue({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid', details: [] });
  });

  it('returns 400 when resetPasswordWithToken fails', async () => {
    mockResetPasswordWithToken.mockResolvedValue({ success: false, error: 'expired token' });

    const response = await POST(buildRequest({ token: 'abc', password: 'StrongKey1!' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('expired token');
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Password reset failed',
      expect.objectContaining({ error: 'expired token' })
    );
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, headers: { 'Retry-After': '120' } });

    const response = await POST(buildRequest({ token: 'abc', password: 'StrongKey1!' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('120');
  });

  it('returns 500 when an unexpected error occurs', async () => {
    mockResetPasswordWithToken.mockRejectedValue(new Error('db down'));

    const response = await POST(buildRequest({ token: 'abc', password: 'StrongKey1!' }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error processing password reset confirmation',
      expect.objectContaining({ error: 'db down' })
    );
  });
});
