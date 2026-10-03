import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSignJWTInstance = vi.hoisted(() => ({
  setProtectedHeader: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  setIssuer: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  sign: vi.fn().mockResolvedValue('jwt-token'),
}));

const mockSignJWT = vi.hoisted(() => {
  function SignJWTConstructor() {
    return mockSignJWTInstance;
  }
  return vi.fn().mockImplementation(SignJWTConstructor);
});

const mockImportPKCS8 = vi.hoisted(() => vi.fn());

vi.mock('jose', () => ({
  SignJWT: mockSignJWT,
  importPKCS8: mockImportPKCS8,
}));

import {
  getInstallationToken,
  clearInstallationTokenCache,
} from '../github-app-tokens';
import { importPKCS8 } from 'jose';

vi.mock('./logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('github-app-tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GITHUB_APP_ID', '12345');
    vi.stubEnv('GITHUB_APP_PRIVATE_KEY', '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearInstallationTokenCache(1n);
  });

  describe('getInstallationToken', () => {
    it('returns cached token when available', async () => {
      const mockToken = 'cached-token';
      mockImportPKCS8.mockResolvedValue({} as any);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      // First call to populate cache
      await getInstallationToken(1n);
      vi.clearAllMocks();

      // Second call should use cache
      const result = await getInstallationToken(1n);

      expect(result).toBe(mockToken);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches new token when cache is empty', async () => {
      const mockToken = 'new-token';
      mockImportPKCS8.mockResolvedValue({} as any);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: mockToken,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      const result = await getInstallationToken(1n);

      expect(result).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/app/installations/1/access_tokens',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer jwt-token',
          }),
        })
      );
    });

    it('handles base64-encoded private key', async () => {
      vi.unstubAllEnvs();
      vi.stubEnv('GITHUB_APP_ID', '12345');
      vi.stubEnv('GITHUB_APP_PRIVATE_KEY', Buffer.from('-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----').toString('base64'));

      mockImportPKCS8.mockResolvedValue({} as any);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'token',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      await getInstallationToken(1n);

      expect(importPKCS8).toHaveBeenCalledWith(
        expect.stringContaining('BEGIN PRIVATE KEY'),
        'RS256'
      );
    });

    it('throws error when GITHUB_APP_ID is missing', async () => {
      vi.unstubAllEnvs();
      delete process.env.GITHUB_APP_ID;

      await expect(getInstallationToken(1n)).rejects.toThrow('GITHUB_APP_ID');
    });

    it('throws error when GITHUB_APP_PRIVATE_KEY is missing', async () => {
      vi.unstubAllEnvs();
      vi.stubEnv('GITHUB_APP_ID', '12345');
      delete process.env.GITHUB_APP_PRIVATE_KEY;

      await expect(getInstallationToken(1n)).rejects.toThrow('GITHUB_APP_PRIVATE_KEY');
    });
  });

  describe('clearInstallationTokenCache', () => {
    it('clears token cache for installation', async () => {
      mockImportPKCS8.mockResolvedValue({} as any);
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'token-1',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      await getInstallationToken(1n);
      clearInstallationTokenCache(1n);

      // Next call should fetch new token
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'token-2',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      const result = await getInstallationToken(1n);

      expect(result).toBe('token-2');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

