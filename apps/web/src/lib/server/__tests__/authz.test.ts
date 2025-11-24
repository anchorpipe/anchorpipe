import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthzContext, requireAuthz, createAuthzMiddleware } from '../authz';
import { buildNextRequest } from '@/test-utils/build-next-request';
import type { NextRequest } from 'next/server';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockGetUserAbility = vi.hoisted(() => vi.fn());

vi.mock('./auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('./rbac-service', () => ({
  getUserAbility: mockGetUserAbility,
}));

const mockAbility = {
  can: vi.fn(),
  cannot: vi.fn(),
};

describe('authz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserAbility.mockResolvedValue(mockAbility);
  });

  describe('getAuthzContext', () => {
    it('returns null when user is not authenticated', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const request = buildNextRequest('http://localhost?repoId=repo-1');
      const result = await getAuthzContext(request);

      expect(result).toBeNull();
    });

    it('returns null when repoId is missing', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });

      const request = buildNextRequest('http://localhost');
      const result = await getAuthzContext(request);

      expect(result).toBeNull();
    });

    it('returns context when authenticated with repoId in query', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });

      const request = buildNextRequest('http://localhost?repoId=repo-1');
      const result = await getAuthzContext(request);

      expect(result).toEqual({
        userId: 'user-1',
        repoId: 'repo-1',
        ability: mockAbility,
      });
      expect(mockGetUserAbility).toHaveBeenCalledWith('user-1', 'repo-1');
    });

    it('uses provided repoId parameter over query param', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });

      const request = buildNextRequest('http://localhost?repoId=repo-query');
      const result = await getAuthzContext(request, 'repo-param');

      expect(result?.repoId).toBe('repo-param');
      expect(mockGetUserAbility).toHaveBeenCalledWith('user-1', 'repo-param');
    });
  });

  describe('requireAuthz', () => {
    it('throws when user is not authenticated', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const request = buildNextRequest('http://localhost?repoId=repo-1');

      await expect(requireAuthz(request, 'read', 'role', 'repo-1')).rejects.toThrow(
        'Unauthorized: authentication required'
      );
    });

    it('throws when user lacks permission', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });
      mockAbility.can.mockReturnValueOnce(false);

      const request = buildNextRequest('http://localhost?repoId=repo-1');

      await expect(requireAuthz(request, 'write', 'role', 'repo-1')).rejects.toThrow(
        'Forbidden: cannot write role'
      );
    });

    it('returns context when authorized', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });
      mockAbility.can.mockReturnValueOnce(true);

      const request = buildNextRequest('http://localhost?repoId=repo-1');
      const result = await requireAuthz(request, 'read', 'role', 'repo-1');

      expect(result).toEqual({
        userId: 'user-1',
        repoId: 'repo-1',
        ability: mockAbility,
      });
      expect(mockAbility.can).toHaveBeenCalledWith('read', 'role');
    });
  });

  describe('createAuthzMiddleware', () => {
    it('returns 401 for unauthenticated requests', async () => {
      mockReadSession.mockResolvedValueOnce(null);

      const middleware = createAuthzMiddleware('read', 'role');
      const request = buildNextRequest('http://localhost?repoId=repo-1');
      const response = await middleware(request, 'repo-1');

      expect(response).toBeInstanceOf(Response);
      if (response instanceof Response) {
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized: authentication required' });
      }
    });

    it('returns 403 for unauthorized requests', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });
      mockAbility.can.mockReturnValueOnce(false);

      const middleware = createAuthzMiddleware('write', 'role');
      const request = buildNextRequest('http://localhost?repoId=repo-1');
      const response = await middleware(request, 'repo-1');

      expect(response).toBeInstanceOf(Response);
      if (response instanceof Response) {
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: 'Forbidden: cannot write role' });
      }
    });

    it('returns context when authorized', async () => {
      mockReadSession.mockResolvedValueOnce({ sub: 'user-1' });
      mockAbility.can.mockReturnValueOnce(true);

      const middleware = createAuthzMiddleware('read', 'role');
      const request = buildNextRequest('http://localhost?repoId=repo-1');
      const result = await middleware(request, 'repo-1');

      expect(result).not.toBeInstanceOf(Response);
      if (result && !(result instanceof Response)) {
        expect(result.userId).toBe('user-1');
      }
    });
  });
});

