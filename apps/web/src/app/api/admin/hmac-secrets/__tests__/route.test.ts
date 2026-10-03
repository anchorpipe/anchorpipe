import { describe, beforeEach, it, expect, vi } from 'vitest';
import { RepoRole } from '@/lib/rbac';
import { GET, POST, PUT, DELETE } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockGetAuthzContext = vi.hoisted(() => vi.fn());
const mockGetUserRepoRole = vi.hoisted(() => vi.fn());
const mockListHmacSecrets = vi.hoisted(() => vi.fn());
const mockCreateHmacSecret = vi.hoisted(() => vi.fn());
const mockRotateHmacSecret = vi.hoisted(() => vi.fn());
const mockRevokeHmacSecret = vi.hoisted(() => vi.fn());
const mockGetHmacSecretById = vi.hoisted(() => vi.fn());
const mockGenerateHmacSecret = vi.hoisted(() => vi.fn());
const mockValidateRequest = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '127.0.0.1', userAgent: 'vitest' }))
);

vi.mock('@/lib/server/authz', () => ({
  getAuthzContext: mockGetAuthzContext,
}));

vi.mock('@/lib/server/rbac-service', () => ({
  getUserRepoRole: mockGetUserRepoRole,
}));

vi.mock('@/lib/server/hmac-secrets', () => ({
  createHmacSecret: mockCreateHmacSecret,
  rotateHmacSecret: mockRotateHmacSecret,
  revokeHmacSecret: mockRevokeHmacSecret,
  listHmacSecrets: mockListHmacSecrets,
  getHmacSecretById: mockGetHmacSecretById,
  generateHmacSecret: mockGenerateHmacSecret,
}));

vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

vi.mock('@/lib/server/audit-service', () => ({
  writeAuditLog: mockWriteAuditLog,
  AUDIT_ACTIONS: {
    hmacSecretCreated: 'created',
    hmacSecretRotated: 'rotated',
    hmacSecretRevoked: 'revoked',
  },
  AUDIT_SUBJECTS: {
    security: 'security',
  },
  extractRequestContext: mockExtractRequestContext,
}));

const buildRequestWithQuery = (query?: string) =>
  buildNextRequest(
    `http://localhost/api/admin/hmac-secrets${query ? `${query.startsWith('?') ? '' : '?'}${query}` : ''}`
  );

const buildJsonRequest = (body: unknown, method: string) =>
  buildNextRequest('http://localhost/api/admin/hmac-secrets', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('/api/admin/hmac-secrets GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthzContext.mockResolvedValue({ userId: 'user-1' });
    mockGetUserRepoRole.mockResolvedValue(RepoRole.ADMIN);
    mockListHmacSecrets.mockResolvedValue([{ id: 'secret-1' }]);
  });

  it('requires repoId in the query string', async () => {
    const res = await GET(buildRequestWithQuery());
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    mockGetAuthzContext.mockResolvedValueOnce(null);

    const res = await GET(buildRequestWithQuery('?repoId=123'));

    expect(res.status).toBe(401);
  });

  it('requires admin role', async () => {
    mockGetUserRepoRole.mockResolvedValueOnce(RepoRole.MEMBER);

    const res = await GET(buildRequestWithQuery('?repoId=123'));

    expect(res.status).toBe(403);
  });

  it('returns secrets when authorized', async () => {
    const res = await GET(buildRequestWithQuery('?repoId=123'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ secrets: [{ id: 'secret-1' }] });
    expect(mockListHmacSecrets).toHaveBeenCalledWith('123');
  });
});

describe('/api/admin/hmac-secrets POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthzContext.mockResolvedValue({ userId: 'admin-1' });
    mockGetUserRepoRole.mockResolvedValue(RepoRole.ADMIN);
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { repoId: '123', name: 'webhook', expiresAt: undefined },
    });
    mockGenerateHmacSecret.mockReturnValue('secret-value');
    mockCreateHmacSecret.mockResolvedValue({
      id: 'secret-1',
      name: 'webhook',
      secret: 'secret-value',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('validates payloads', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const res = await POST(buildJsonRequest({}, 'POST'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid', details: [] });
  });

  it('creates secrets and logs audit trail', async () => {
    const res = await POST(buildJsonRequest({ repoId: '123', name: 'webhook' }, 'POST'));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: 'secret-1',
      name: 'webhook',
      secret: 'secret-value',
      message: expect.stringContaining('Secret created'),
    });
    expect(mockCreateHmacSecret).toHaveBeenCalledWith({
      repoId: '123',
      name: 'webhook',
      secret: 'secret-value',
      createdBy: 'admin-1',
      expiresAt: undefined,
    });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        subjectId: '123',
      })
    );
  });
});

describe('/api/admin/hmac-secrets PUT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthzContext.mockResolvedValue({ userId: 'admin-1' });
    mockGetUserRepoRole.mockResolvedValue(RepoRole.ADMIN);
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: {
        oldSecretId: 'secret-old',
        repoId: '123',
        name: 'rotated',
        expiresAt: undefined,
      },
    });
    mockRotateHmacSecret.mockResolvedValue({
      id: 'secret-new',
      name: 'rotated',
      secret: 'new-secret',
      createdAt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('validates payloads', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const res = await PUT(buildJsonRequest({}, 'PUT'));

    expect(res.status).toBe(400);
  });

  it('rotates secrets and logs audit entries', async () => {
    const res = await PUT(
      buildJsonRequest({ oldSecretId: 'secret-old', repoId: '123', name: 'rotated' }, 'PUT')
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      id: 'secret-new',
      name: 'rotated',
      secret: 'new-secret',
    });
    expect(mockRotateHmacSecret).toHaveBeenCalledWith({
      oldSecretId: 'secret-old',
      repoId: '123',
      name: 'rotated',
      createdBy: 'admin-1',
      expiresAt: undefined,
    });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'rotated',
        metadata: expect.objectContaining({ newSecretId: 'secret-new', oldSecretId: 'secret-old' }),
      })
    );
  });
});

describe('/api/admin/hmac-secrets DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { secretId: 'secret-1' },
    });
    mockGetHmacSecretById.mockResolvedValue({
      id: 'secret-1',
      repoId: '123',
      name: 'webhook',
    });
    mockGetAuthzContext.mockResolvedValue({ userId: 'admin-1' });
    mockGetUserRepoRole.mockResolvedValue(RepoRole.ADMIN);
  });

  it('validates payloads', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const res = await DELETE(buildJsonRequest({}, 'DELETE'));

    expect(res.status).toBe(400);
  });

  it('returns 404 when secret is missing', async () => {
    mockGetHmacSecretById.mockResolvedValueOnce(null);

    const res = await DELETE(buildJsonRequest({ secretId: 'secret-1' }, 'DELETE'));

    expect(res.status).toBe(404);
  });

  it('revokes secrets and writes audit logs', async () => {
    const res = await DELETE(buildJsonRequest({ secretId: 'secret-1' }, 'DELETE'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Secret revoked successfully' });
    expect(mockRevokeHmacSecret).toHaveBeenCalledWith('secret-1');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'revoked',
        metadata: expect.objectContaining({ secretId: 'secret-1', name: 'webhook' }),
      })
    );
  });
});
