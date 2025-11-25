import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST } from '../route';

const mockPrisma = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

const mockCreateSessionJwt = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/auth', () => ({
  createSessionJwt: mockCreateSessionJwt,
  setSessionCookie: mockSetSessionCookie,
}));

const mockVerifyPassword = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/password', () => ({
  verifyPassword: mockVerifyPassword,
}));

const mockValidateRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

vi.mock('@/lib/schemas/auth', () => ({
  loginSchema: {},
}));

const mockRecordFailedAttempt = vi.hoisted(() => vi.fn(() => ({ locked: false })));
const mockCheckBruteForceLock = vi.hoisted(() => vi.fn());
const mockClearFailedAttempts = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/brute-force', () => ({
  checkBruteForceLock: mockCheckBruteForceLock,
  recordFailedAttempt: mockRecordFailedAttempt,
  clearFailedAttempts: mockClearFailedAttempts,
}));

const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  }))
);
vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: {
    loginFailure: 'login_failure',
    loginSuccess: 'login_success',
  },
  AUDIT_SUBJECTS: {
    security: 'security',
    user: 'user',
  },
  writeAuditLog: mockWriteAuditLog,
  extractRequestContext: mockExtractRequestContext,
}));

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

describe('/api/auth/login POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { email: 'a@b.com', password: 'pw' },
    });
    mockCheckBruteForceLock.mockReturnValue({ locked: false });
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      preferences: { passwordHash: 'hash' },
    });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSessionJwt.mockResolvedValue('token');
  });

  it('returns ok on successful login', async () => {
    const response = await POST(buildRequest({ email: 'a@b.com', password: 'pw' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    expect(mockCreateSessionJwt).toHaveBeenCalledWith({ sub: 'user-1', email: 'a@b.com' });
    expect(mockSetSessionCookie).toHaveBeenCalledWith('token');
    expect(mockClearFailedAttempts).toHaveBeenCalledWith('127.0.0.1', 'a@b.com');
  });

  it('returns 401 when user not found without revealing details', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const response = await POST(buildRequest({ email: 'none@b.com', password: 'pw' }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Invalid credentials' });
    expect(mockRecordFailedAttempt).toHaveBeenCalled();
    expect(mockCreateSessionJwt).not.toHaveBeenCalled();
  });

  it('returns 401 when password is invalid', async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const response = await POST(buildRequest({ email: 'a@b.com', password: 'bad' }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Invalid credentials' });
    expect(mockRecordFailedAttempt).toHaveBeenCalledWith('127.0.0.1', 'a@b.com');
  });

  it('returns 400 when validation fails', async () => {
    mockValidateRequest.mockResolvedValue({
      success: false,
      error: { error: 'invalid', details: [{ path: 'email', message: 'Required' }] },
    });

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid');
  });
});
