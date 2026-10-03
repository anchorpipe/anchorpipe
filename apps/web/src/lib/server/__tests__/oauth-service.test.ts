// cspell:ignore anchorpipe octocat
import { describe, expect, it, beforeEach, vi } from 'vitest';
const mockPrisma = vi.hoisted(() => ({
  account: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
  PrismaClient: vi.fn(() => mockPrisma),
}));

const mockExchangeCodeForToken = vi.hoisted(() => vi.fn());
const mockFetchGitHubUser = vi.hoisted(() => vi.fn());
const mockGetClientId = vi.hoisted(() => vi.fn(() => 'client-id'));
const mockGetClientSecret = vi.hoisted(() => vi.fn(() => 'client-secret'));

vi.mock('../oauth', () => ({
  exchangeCodeForToken: mockExchangeCodeForToken,
  fetchGitHubUser: mockFetchGitHubUser,
  getGitHubClientId: mockGetClientId,
  getGitHubClientSecret: mockGetClientSecret,
}));

const mockEncryptField = vi.hoisted(() => vi.fn((value) => (value ? `encrypted:${value}` : null)));
vi.mock('../secrets', () => ({
  encryptField: mockEncryptField,
}));

const mockCreateSessionJwt = vi.hoisted(() => vi.fn());
const mockSetSessionCookie = vi.hoisted(() => vi.fn());
vi.mock('../auth', () => ({
  createSessionJwt: mockCreateSessionJwt,
  setSessionCookie: mockSetSessionCookie,
}));

const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '1.1.1.1', userAgent: 'vitest' }))
);
vi.mock('../audit-service', () => ({
  AUDIT_ACTIONS: {
    userCreated: 'user_created',
    loginSuccess: 'login_success',
    loginFailure: 'login_failure',
  },
  AUDIT_SUBJECTS: {
    user: 'user',
    security: 'security',
  },
  writeAuditLog: mockWriteAuditLog,
  extractRequestContext: mockExtractRequestContext,
}));

import {
  handleOAuthCallback,
  linkOrCreateGitHubAccount,
} from '../oauth-service';

const baseGithubUser = {
  id: 123,
  login: 'octocat',
  name: 'Octo Cat',
  email: 'octo@example.com',
  avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4',
};

const tokenResponse = {
  access_token: 'token',
  token_type: 'bearer',
  expires_in: 3600,
  scope: 'read:user',
};

const mockRequest = {} as any;

describe('oauth-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockPrisma.account).forEach((fn) => fn.mockReset());
    Object.values(mockPrisma.user).forEach((fn) => fn.mockReset());
  });

  it('updates existing account when provider account found', async () => {
    mockPrisma.account.findUnique.mockResolvedValue({
      id: 'acct-1',
      userId: 'user-1',
      user: { id: 'user-1', name: 'Old', email: 'old@example.com' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: null, email: null });
    mockPrisma.account.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});

    const result = await linkOrCreateGitHubAccount(
      baseGithubUser,
      tokenResponse,
      mockRequest
    );

    expect(result).toEqual({ success: true, userId: 'user-1' });
    expect(mockPrisma.account.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'acct-1' } })
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ githubId: String(baseGithubUser.id) }),
      })
    );
  });

  it('links account to existing user by email', async () => {
    mockPrisma.account.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-2' });

    const result = await linkOrCreateGitHubAccount(
      baseGithubUser,
      tokenResponse,
      mockRequest
    );

    expect(result).toEqual({ success: true, userId: 'user-2' });
    expect(mockPrisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-2' }),
      })
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-2' },
        data: expect.objectContaining({ githubId: String(baseGithubUser.id) }),
      })
    );
  });

  it('creates new user when no matches exist', async () => {
    mockPrisma.account.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-new' });

    const result = await linkOrCreateGitHubAccount(
      { ...baseGithubUser, email: null },
      tokenResponse,
      mockRequest
    );

    expect(result).toEqual({ success: true, userId: 'user-new' });
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockPrisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-new' }),
      })
    );
  });

  it('handles OAuth callback and creates session cookie', async () => {
    mockExchangeCodeForToken.mockResolvedValue(tokenResponse);
    mockFetchGitHubUser.mockResolvedValue(baseGithubUser);
    mockPrisma.account.findUnique.mockResolvedValue({
      id: 'acct-1',
      userId: 'user-1',
      user: { id: 'user-1' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'octo@example.com' });
    mockPrisma.account.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});
    mockCreateSessionJwt.mockResolvedValue('signed-token');

    const result = await handleOAuthCallback({
      code: 'auth-code',
      state: 'state',
      codeVerifier: 'verifier',
      redirectUri: 'https://example.com/callback',
      request: mockRequest,
    });

    expect(result.success).toBe(true);
    expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'auth-code' })
    );
    expect(mockFetchGitHubUser).toHaveBeenCalledWith(tokenResponse.access_token);
    expect(mockCreateSessionJwt).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', email: 'octo@example.com' })
    );
    expect(mockSetSessionCookie).toHaveBeenCalledWith('signed-token');
  });

  it('returns failure when linking throws', async () => {
    mockPrisma.account.findUnique.mockRejectedValue(new Error('db down'));

    const result = await linkOrCreateGitHubAccount(
      baseGithubUser,
      tokenResponse,
      mockRequest
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('db down');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_failure',
        subject: 'security',
      })
    );
  });
});

