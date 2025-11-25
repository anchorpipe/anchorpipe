/* cspell:ignore anchorpipe unstub */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockContext = { ipAddress: '127.0.0.1', userAgent: 'vitest' };
const mockPrisma = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));
const mockValidateRequest = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockCreateEmailVerificationToken = vi.hoisted(() => vi.fn());
const mockCreateSessionJwt = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() => vi.fn(() => mockContext));
const mockQueueEmail = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@anchorpipe/database', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

vi.mock('@/lib/server/password', () => ({
  hashPassword: mockHashPassword,
}));

vi.mock('@/lib/server/email-verification', () => ({
  createEmailVerificationToken: mockCreateEmailVerificationToken,
}));

vi.mock('@/lib/server/auth', () => ({
  createSessionJwt: mockCreateSessionJwt,
  setSessionCookie: mockSetSessionCookie,
}));

vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: {
    loginFailure: 'loginFailure',
    userCreated: 'userCreated',
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

describe('/api/auth/register POST', () => {
  const requestBody = { email: 'USER@example.com', password: 'Rocket1!' };
  const registerUrl = 'http://localhost/api/auth/register';

  const buildRegisterRequest = (body: unknown = requestBody) =>
    buildNextRequest(registerUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRequest.mockResolvedValue({ success: true, data: requestBody });
    mockHashPassword.mockResolvedValue('hashed');
    mockCreateEmailVerificationToken.mockResolvedValue({
      token: 'verify-token',
      expiresAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });
    mockCreateSessionJwt.mockResolvedValue('jwt-token');
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('validates payloads', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const res = await POST(buildRegisterRequest({}));

    expect(res.status).toBe(400);
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when user already exists', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'user-2' });

    const res = await POST(buildRegisterRequest());

    expect(res.status).toBe(409);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('creates user, queues email, and returns 201', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const res = await POST(buildRegisterRequest());

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      verificationToken: 'verify-token',
      verificationUrl: expect.stringContaining('verify-email'),
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'USER@example.com',
      }),
    });
    expect(mockQueueEmail).toHaveBeenCalledWith(
      'user-1',
      'email.verification',
      expect.objectContaining({
        verificationUrl: expect.stringContaining('verify-email'),
      })
    );
    expect(mockCreateSessionJwt).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'user@example.com',
    });
    expect(mockSetSessionCookie).toHaveBeenCalledWith('jwt-token');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'userCreated',
        subjectId: 'user-1',
      })
    );
  });
});
