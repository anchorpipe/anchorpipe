import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));
const mockReadSession = vi.hoisted(() => vi.fn());
const mockIsEmailVerified = vi.hoisted(() => vi.fn());
const mockCreateEmailVerificationToken = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '1.1.1.1', userAgent: 'vitest' }))
);
const mockQueueEmail = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/email-verification', () => ({
  isEmailVerified: mockIsEmailVerified,
  createEmailVerificationToken: mockCreateEmailVerificationToken,
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

vi.mock('@/lib/server/email-queue-processor', () => ({
  queueEmail: mockQueueEmail,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

describe('/api/auth/resend-verification POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
    mockIsEmailVerified.mockResolvedValue(false);
    mockCreateEmailVerificationToken.mockResolvedValue({
      token: 'token',
      expiresAt: new Date('2025-01-01T00:00:00.000Z'),
    });
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await POST(
      buildNextRequest('http://localhost/api/auth/resend-verification', { method: 'POST' })
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 when user missing email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ email: null });

    const res = await POST(
      buildNextRequest('http://localhost/api/auth/resend-verification', { method: 'POST' })
    );

    expect(res.status).toBe(404);
  });

  it('returns message when already verified', async () => {
    mockIsEmailVerified.mockResolvedValueOnce(true);

    const res = await POST(
      buildNextRequest('http://localhost/api/auth/resend-verification', { method: 'POST' })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: 'Email address is already verified.',
      verified: true,
    });
  });

  it('queues verification email when successful', async () => {
    const res = await POST(
      buildNextRequest('http://localhost/api/auth/resend-verification', { method: 'POST' })
    );

    expect(res.status).toBe(200);
    expect(mockQueueEmail).toHaveBeenCalledWith(
      'user-1',
      'email.verification',
      expect.objectContaining({
        verificationUrl: expect.stringContaining('verify-email'),
      })
    );
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'configUpdated',
        subjectId: 'user-1',
      })
    );
  });
});
