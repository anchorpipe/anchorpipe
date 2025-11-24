import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockPrisma = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

const mockRateLimit = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/rate-limit', () => ({
  rateLimit: mockRateLimit,
}));

const mockValidateRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

const mockCreatePasswordResetToken = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/password-reset', () => ({
  createPasswordResetToken: mockCreatePasswordResetToken,
}));

const mockQueueEmail = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/email-queue-processor', () => ({
  queueEmail: mockQueueEmail,
}));

const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '203.0.113.1', userAgent: 'vitest' }))
);
vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: { loginFailure: 'login_failure', configUpdated: 'config_updated' },
  AUDIT_SUBJECTS: { security: 'security', user: 'user' },
  writeAuditLog: mockWriteAuditLog,
  extractRequestContext: mockExtractRequestContext,
}));

const mockLoggerInfo = vi.hoisted(() => vi.fn());
const mockLoggerWarn = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/logger', () => ({
  logger: { info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError },
}));

const buildRequest = (body: unknown) =>
  buildNextRequest('http://localhost/api/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('/api/auth/password-reset/request POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ allowed: true, headers: {} });
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { email: 'user@example.com' },
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      preferences: { password: 'hash' },
    });
    mockCreatePasswordResetToken.mockResolvedValue({
      token: 'abc',
      expiresAt: new Date('2025-01-01T00:00:00Z'),
    });
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns success response and queues email when user exists', async () => {
    const response = await POST(buildRequest({ email: 'user@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('If an account');
    expect(mockCreatePasswordResetToken).toHaveBeenCalledWith('user-1');
    expect(mockQueueEmail).toHaveBeenCalledWith(
      'user-1',
      'password.reset',
      expect.objectContaining({ resetUrl: expect.stringContaining('reset-password') })
    );
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'config_updated',
        subject: 'user',
      })
    );
  });

  it('hides existence when user missing or no password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const response = await POST(buildRequest({ email: 'unknown@example.com' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('If an account');
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Password reset requested for invalid account',
      expect.any(Object)
    );
  });

  it('returns 400 when validation fails', async () => {
    mockValidateRequest.mockResolvedValue({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const response = await POST(buildRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('invalid');
  });

  it('returns 429 when rate limit blocked', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, headers: { 'Retry-After': '60' } });

    const response = await POST(buildRequest({ email: 'user@example.com' }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('returns 500 when unexpected error thrown', async () => {
    mockPrisma.user.findFirst.mockRejectedValue(new Error('db down'));

    const response = await POST(buildRequest({ email: 'user@example.com' }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error processing password reset request',
      expect.objectContaining({ error: 'db down' })
    );
  });
});
