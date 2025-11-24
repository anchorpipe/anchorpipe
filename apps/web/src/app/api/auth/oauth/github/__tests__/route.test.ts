import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockCookies = vi.hoisted(() => vi.fn());
const mockGetClientId = vi.hoisted(() => vi.fn());
const mockGenerateCodeVerifier = vi.hoisted(() => vi.fn());
const mockGenerateState = vi.hoisted(() => vi.fn());
const mockBuildAuthUrl = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

vi.mock('@/lib/server/oauth', () => ({
  buildGitHubAuthUrl: mockBuildAuthUrl,
  generateCodeVerifier: mockGenerateCodeVerifier,
  generateState: mockGenerateState,
  getGitHubClientId: mockGetClientId,
}));

describe('/api/auth/oauth/github GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('GITHUB_CLIENT_ID', 'client');
    mockGetClientId.mockReturnValue('client');
    mockGenerateCodeVerifier.mockReturnValue('verifier');
    mockGenerateState.mockReturnValue('state');
    mockBuildAuthUrl.mockReturnValue(new URL('https://github.com/login/oauth/authorize'));
    mockCookies.mockResolvedValue({
      set: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 503 in production when client id missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GITHUB_CLIENT_ID', '');
    mockGetClientId.mockImplementation(() => {
      throw new Error('missing');
    });

    const res = await GET(buildNextRequest('http://localhost/api/auth/oauth/github'));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'GitHub OAuth is not configured' });
  });

  it('stores oauth cookies and redirects to GitHub', async () => {
    const store = {
      set: vi.fn(),
    };
    mockCookies.mockResolvedValue(store);

    const res = await GET(
      buildNextRequest('http://localhost/api/auth/oauth/github?return_to=%2Fwelcome')
    );

    expect(mockGenerateCodeVerifier).toHaveBeenCalled();
    expect(mockGenerateState).toHaveBeenCalled();
    expect(store.set).toHaveBeenCalledWith(
      'oauth_code_verifier',
      'verifier',
      expect.objectContaining({ httpOnly: true, maxAge: 600 })
    );
    expect(store.set).toHaveBeenCalledWith(
      'oauth_state',
      'state',
      expect.objectContaining({ httpOnly: true, maxAge: 600 })
    );
    expect(store.set).toHaveBeenCalledWith(
      'oauth_return_to',
      '/welcome',
      expect.objectContaining({ httpOnly: true })
    );
    expect(mockBuildAuthUrl).toHaveBeenCalledWith({
      clientId: 'client',
      redirectUri: 'http://localhost/api/auth/callback/github',
      codeVerifier: 'verifier',
      state: 'state',
      returnTo: '/welcome',
    });
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://github.com/login/oauth/authorize');
  });

  it('returns 500 when initiation fails unexpectedly', async () => {
    mockGetClientId.mockImplementation(() => {
      throw new Error('boom');
    });
    vi.stubEnv('NODE_ENV', 'development');

    const res = await GET(buildNextRequest('http://localhost/api/auth/oauth/github'));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });
});
