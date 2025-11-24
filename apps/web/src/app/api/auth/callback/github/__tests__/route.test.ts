import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockCookies = vi.hoisted(() => vi.fn());
const mockHandleOAuthCallback = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

vi.mock('@/lib/server/oauth-service', () => ({
  handleOAuthCallback: mockHandleOAuthCallback,
}));

function buildCookieStore(overrides?: {
  state?: string | null;
  verifier?: string | null;
  returnTo?: string | null;
}) {
  return {
    get: vi.fn((key: string) => {
      if (key === 'oauth_state' && overrides?.state !== undefined) {
        return overrides.state ? { value: overrides.state } : undefined;
      }
      if (key === 'oauth_code_verifier' && overrides?.verifier !== undefined) {
        return overrides.verifier ? { value: overrides.verifier } : undefined;
      }
      if (key === 'oauth_return_to' && overrides?.returnTo !== undefined) {
        return overrides.returnTo ? { value: overrides.returnTo } : undefined;
      }
      return undefined;
    }),
    delete: vi.fn(),
  };
}

describe('/api/auth/callback/github GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleOAuthCallback.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('redirects with oauth_error when GitHub returns error', async () => {
    const res = await GET(
      buildNextRequest(
        'http://localhost/api/auth/callback/github?error=bad&error_description=denied'
      )
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=oauth_error');
    expect(res.headers.get('location')).toContain('denied');
  });

  it('redirects with invalid_request when code or state missing', async () => {
    const res = await GET(buildNextRequest('http://localhost/api/auth/callback/github?code=abc'));

    expect(res.headers.get('location')).toContain('invalid_request');
  });

  it('rejects when OAuth state mismatches', async () => {
    const store = buildCookieStore({ state: 'expected', verifier: 'verifier', returnTo: '/dash' });
    mockCookies.mockResolvedValue(store);

    const res = await GET(
      buildNextRequest('http://localhost/api/auth/callback/github?code=abc&state=wrong')
    );

    expect(store.get).toHaveBeenCalledWith('oauth_state');
    expect(res.headers.get('location')).toContain('invalid_state');
  });

  it('rejects when verifier missing', async () => {
    const store = buildCookieStore({ state: 'state', verifier: null });
    mockCookies.mockResolvedValue(store);

    const res = await GET(
      buildNextRequest('http://localhost/api/auth/callback/github?code=abc&state=state')
    );

    expect(res.headers.get('location')).toContain('Code%20verifier%20missing');
  });

  it('clears cookies and redirects on success', async () => {
    const store = buildCookieStore({ state: 'match', verifier: 'code', returnTo: '/welcome' });
    mockCookies.mockResolvedValue(store);
    mockHandleOAuthCallback.mockResolvedValue({ success: true });

    const res = await GET(
      buildNextRequest('http://localhost/api/auth/callback/github?code=abc&state=match')
    );

    expect(mockHandleOAuthCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'abc',
        state: 'match',
        codeVerifier: 'code',
        redirectUri: 'http://localhost/api/auth/callback/github',
      })
    );
    expect(store.delete).toHaveBeenCalledWith('oauth_state');
    expect(store.delete).toHaveBeenCalledWith('oauth_code_verifier');
    expect(store.delete).toHaveBeenCalledWith('oauth_return_to');
    expect(res.headers.get('location')).toBe('http://localhost/welcome');
  });

  it('redirects with oauth_failed when handler returns error', async () => {
    const store = buildCookieStore({ state: 'match', verifier: 'code' });
    mockCookies.mockResolvedValue(store);
    mockHandleOAuthCallback.mockResolvedValue({ success: false, error: 'boom' });

    const res = await GET(
      buildNextRequest('http://localhost/api/auth/callback/github?code=abc&state=match')
    );

    expect(res.headers.get('location')).toContain('oauth_failed');
    expect(res.headers.get('location')).toContain('boom');
  });

  it('redirects with oauth_error when handler throws', async () => {
    const store = buildCookieStore({ state: 'match', verifier: 'code' });
    mockCookies.mockResolvedValue(store);
    mockHandleOAuthCallback.mockRejectedValue(new Error('network'));

    const res = await GET(
      buildNextRequest('http://localhost/api/auth/callback/github?code=abc&state=match')
    );

    expect(res.headers.get('location')).toContain('oauth_error');
    expect(res.headers.get('location')).toContain('network');
  });
});

