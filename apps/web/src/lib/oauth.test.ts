import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildGitHubAuthUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
} from './oauth';

// Mock crypto module
vi.mock('crypto', () => {
  const actual = vi.importActual('crypto');
  return {
    ...actual,
    randomBytes: (size: number) => Buffer.alloc(size, 0x42), // Predictable for testing
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('OAuth utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a base64url-encoded string', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeTruthy();
      expect(typeof verifier).toBe('string');
      // Base64URL should not contain +, /, or =
      expect(verifier).not.toContain('+');
      expect(verifier).not.toContain('/');
      expect(verifier).not.toContain('=');
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate SHA256 hash of verifier as base64url', () => {
      const verifier = 'test-verifier';
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeTruthy();
      expect(typeof challenge).toBe('string');
      // Base64URL should not contain +, /, or =
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });

    it('should generate consistent challenge for same verifier', () => {
      const verifier = 'test-verifier';
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });
  });

  describe('generateState', () => {
    it('should generate a base64url-encoded string', () => {
      const state = generateState();
      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      // Base64URL should not contain +, /, or =
      expect(state).not.toContain('+');
      expect(state).not.toContain('/');
      expect(state).not.toContain('=');
    });
  });

  describe('buildGitHubAuthUrl', () => {
    it('should build correct GitHub OAuth URL with PKCE', () => {
      const params = {
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        codeVerifier: 'test-verifier',
        state: 'test-state',
      };
      const url = buildGitHubAuthUrl(params);
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=read%3Auser+user%3Aemail');
      expect(url).toContain('state=test-state');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('code_challenge=');
    });

    it('should include return_to parameter when provided', () => {
      const params = {
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        codeVerifier: 'test-verifier',
        state: 'test-state',
        returnTo: '/dashboard',
      };
      const url = buildGitHubAuthUrl(params);
      expect(url).toContain('return_to=%2Fdashboard');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for token successfully', async () => {
      const mockResponse = {
        access_token: 'test-access-token',
        token_type: 'bearer',
        scope: 'read:user user:email',
        expires_in: 3600,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await exchangeCodeForToken({
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        code: 'test-code',
        redirectUri: 'https://example.com/callback',
        codeVerifier: 'test-verifier',
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        })
      );
    });

    it('should throw error on token exchange failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid code',
      } as Response);

      await expect(
        exchangeCodeForToken({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          code: 'invalid-code',
          redirectUri: 'https://example.com/callback',
          codeVerifier: 'test-verifier',
        })
      ).rejects.toThrow('Token exchange failed');
    });

    it('should throw error when GitHub returns error response', async () => {
      const mockErrorResponse = {
        error: 'invalid_grant',
        error_description: 'The code has expired',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse,
      } as Response);

      await expect(
        exchangeCodeForToken({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          code: 'expired-code',
          redirectUri: 'https://example.com/callback',
          codeVerifier: 'test-verifier',
        })
      ).rejects.toThrow('GitHub OAuth error');
    });
  });

  describe('fetchGitHubUser', () => {
    it('should fetch GitHub user profile successfully', async () => {
      const mockUser = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.png',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const result = await fetchGitHubUser('test-access-token');

      expect(result).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            Accept: 'application/json',
            'User-Agent': 'anchorpipe',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(fetchGitHubUser('invalid-token')).rejects.toThrow(
        'Failed to fetch GitHub user'
      );
    });
  });
});

