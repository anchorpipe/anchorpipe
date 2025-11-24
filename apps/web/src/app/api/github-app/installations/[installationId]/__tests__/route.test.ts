import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getInstallation, DELETE as deleteInstallation } from '../route';
import { GET as getHealth } from '../health/route';
import { POST as refreshPermissions } from '../permissions/route';
import { PUT as updateRepositories } from '../repositories/route';
import type { NextRequest } from 'next/server';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockExtractContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '127.0.0.1', userAgent: 'vitest' }))
);
const mockGetInstallation = vi.hoisted(() => vi.fn());
const mockValidatePermissions = vi.hoisted(() => vi.fn());
const mockDeleteInstallation = vi.hoisted(() => vi.fn());
const mockClearTokenCache = vi.hoisted(() => vi.fn());
const mockCheckHealth = vi.hoisted(() => vi.fn());
const mockRefreshPermissions = vi.hoisted(() => vi.fn());
const mockUpdateRepositories = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: mockExtractContext,
}));

vi.mock('@/lib/server/github-app-service', () => ({
  getGitHubAppInstallationById: mockGetInstallation,
  validateInstallationPermissions: mockValidatePermissions,
  deleteGitHubAppInstallation: mockDeleteInstallation,
  checkInstallationHealth: mockCheckHealth,
  refreshInstallationPermissions: mockRefreshPermissions,
  updateInstallationRepositorySelection: mockUpdateRepositories,
}));

vi.mock('@/lib/server/github-app-tokens', () => ({
  clearInstallationTokenCache: mockClearTokenCache,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

const params = Promise.resolve({ installationId: '123' });

describe('/api/github-app/installations/[installationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockGetInstallation.mockResolvedValue({
      id: 123,
      accountLogin: 'acme',
    });
    mockValidatePermissions.mockResolvedValue({
      valid: true,
      missing: [],
      warnings: [],
    });
    mockDeleteInstallation.mockResolvedValue(undefined);
    mockCheckHealth.mockResolvedValue({ healthy: true });
    mockRefreshPermissions.mockResolvedValue({ success: true, validation: { valid: true } });
    mockUpdateRepositories.mockResolvedValue({ success: true, updatedRepositories: 2 });
  });

  describe('GET', () => {
    it('requires authentication', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const res = await getInstallation({} as NextRequest, { params });

      expect(res.status).toBe(401);
    });

    it('returns 404 when installation is missing', async () => {
      mockGetInstallation.mockResolvedValueOnce(null);

      const res = await getInstallation({} as NextRequest, { params });

      expect(res.status).toBe(404);
    });

    it('returns installation details and permissions', async () => {
      const res = await getInstallation({} as NextRequest, { params });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        installation: { id: 123, accountLogin: 'acme' },
        permissions: { valid: true, missing: [], warnings: [] },
      });
    });

    it('handles unexpected errors', async () => {
      mockGetInstallation.mockRejectedValueOnce(new Error('boom'));

      const res = await getInstallation({} as NextRequest, { params });

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting GitHub App installation',
        expect.objectContaining({ error: 'boom' })
      );
    });
  });

  describe('DELETE', () => {
    it('requires authentication', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const res = await deleteInstallation({} as NextRequest, { params });

      expect(res.status).toBe(401);
    });

    it('returns 404 when installation is missing', async () => {
      mockGetInstallation.mockResolvedValueOnce(null);

      const res = await deleteInstallation({} as NextRequest, { params });

      expect(res.status).toBe(404);
    });

    it('deletes installation and clears token cache', async () => {
      const res = await deleteInstallation(
        buildNextRequest('http://localhost/api/github-app/installations/123', { method: 'DELETE' }),
        { params }
      );

      expect(res.status).toBe(200);
      expect(mockDeleteInstallation).toHaveBeenCalledWith(123n, {
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      });
      expect(mockClearTokenCache).toHaveBeenCalledWith(123n);
    });

    it('handles unexpected errors during deletion', async () => {
      mockDeleteInstallation.mockRejectedValueOnce(new Error('db down'));

      const res = await deleteInstallation(
        buildNextRequest('http://localhost/api/github-app/installations/123', { method: 'DELETE' }),
        { params }
      );

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error uninstalling GitHub App installation',
        expect.objectContaining({ error: 'db down' })
      );
    });
  });

  describe('health route', () => {
    it('requires authentication', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const res = await getHealth({} as NextRequest, { params });

      expect(res.status).toBe(401);
    });

    it('returns 200 when installation is healthy', async () => {
      mockCheckHealth.mockResolvedValueOnce({ healthy: true });

      const res = await getHealth({} as NextRequest, { params });

      expect(res.status).toBe(200);
    });

    it('returns 503 when installation is unhealthy', async () => {
      mockCheckHealth.mockResolvedValueOnce({ healthy: false });

      const res = await getHealth({} as NextRequest, { params });

      expect(res.status).toBe(503);
    });

    it('handles unexpected errors', async () => {
      mockCheckHealth.mockRejectedValueOnce(new Error('service down'));

      const res = await getHealth({} as NextRequest, { params });

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking GitHub App installation health',
        expect.objectContaining({ error: 'service down' })
      );
    });
  });

  describe('permissions route', () => {
    it('requires authentication', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const res = await refreshPermissions({} as NextRequest, { params });

      expect(res.status).toBe(401);
    });

    it('returns 404 when installation is missing', async () => {
      mockGetInstallation.mockResolvedValueOnce(null);

      const res = await refreshPermissions({} as NextRequest, { params });

      expect(res.status).toBe(404);
    });

    it('returns 500 when refresh fails', async () => {
      mockRefreshPermissions.mockResolvedValueOnce({ success: false, error: 'Failed' });

      const res = await refreshPermissions(
        buildNextRequest('http://localhost/api/github-app/installations/123/permissions', {
          method: 'POST',
        }),
        { params }
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Failed' });
    });

    it('refreshes permissions and returns validation payload', async () => {
      const res = await refreshPermissions(
        buildNextRequest('http://localhost/api/github-app/installations/123/permissions', {
          method: 'POST',
        }),
        { params }
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        message: 'Permissions refreshed successfully',
        installationId: '123',
        validation: { valid: true },
      });
    });

    it('handles unexpected errors during permission refresh', async () => {
      mockGetInstallation.mockRejectedValueOnce(new Error('db error'));

      const res = await refreshPermissions(
        buildNextRequest('http://localhost/api/github-app/installations/123/permissions', {
          method: 'POST',
        }),
        { params }
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error refreshing installation permissions',
        expect.objectContaining({ error: 'db error' })
      );
    });
  });

  describe('repositories route', () => {
    const buildRepoRequest = (body: unknown) =>
      buildNextRequest('http://localhost/api/github-app/installations/123/repositories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('requires authentication', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const res = await updateRepositories({} as NextRequest, { params });

      expect(res.status).toBe(401);
    });

    it('returns 404 when installation is missing', async () => {
      mockGetInstallation.mockResolvedValueOnce(null);

      const res = await updateRepositories(buildRepoRequest({ repositoryIds: [] }), { params });

      expect(res.status).toBe(404);
    });

    it('validates repositoryIds payload', async () => {
      const res = await updateRepositories(buildRepoRequest({ repositoryIds: 'bad' }), { params });

      expect(res.status).toBe(400);
    });

    it('ensures repositoryIds are positive numbers', async () => {
      const res = await updateRepositories(buildRepoRequest({ repositoryIds: [0, -1] }), {
        params,
      });

      expect(res.status).toBe(400);
    });

    it('updates repository selection successfully', async () => {
      const res = await updateRepositories(buildRepoRequest({ repositoryIds: [1, 2] }), {
        params,
      });

      expect(res.status).toBe(200);
      expect(mockUpdateRepositories).toHaveBeenCalledWith(
        123n,
        [1, 2],
        expect.objectContaining({ ipAddress: '127.0.0.1' })
      );
    });

    it('returns 500 when repository update fails', async () => {
      mockUpdateRepositories.mockResolvedValueOnce({ success: false, error: 'oops' });

      const res = await updateRepositories(buildRepoRequest({ repositoryIds: [1] }), { params });

      expect(res.status).toBe(500);
    });

    it('handles JSON parsing errors', async () => {
      const invalidRequest = buildNextRequest(
        'http://localhost/api/github-app/installations/123/repositories',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        }
      );

      const res = await updateRepositories(invalidRequest, { params });

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating repository selection',
        expect.any(Object)
      );
    });

    it('handles unexpected errors during repository update', async () => {
      mockGetInstallation.mockRejectedValueOnce(new Error('network error'));

      const res = await updateRepositories(buildRepoRequest({ repositoryIds: [1] }), { params });

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating repository selection',
        expect.objectContaining({ error: 'network error' })
      );
    });
  });
});
