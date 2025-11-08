import { randomBytes, createHash } from 'crypto';
import { base64URLEncode } from '../base64';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

export interface OAuthState {
  codeVerifier: string;
  redirectUri: string;
  returnTo?: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * Generate a cryptographically secure random string for PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32));
}

/**
 * Generate PKCE code challenge from verifier (SHA256 hash, base64url encoded)
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}

/**
 * Generate a random state token for CSRF protection
 */
export function generateState(): string {
  return base64URLEncode(randomBytes(32));
}

/**
 * Build GitHub OAuth authorization URL with PKCE
 */
export interface GitHubAuthUrlParams {
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  state: string;
  returnTo?: string;
}

export function buildGitHubAuthUrl(params: GitHubAuthUrlParams): string {
  const { clientId, redirectUri, codeVerifier, state, returnTo } = params;
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const urlParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read:user user:email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  if (returnTo) {
    urlParams.set('return_to', returnTo);
  }
  return `${GITHUB_AUTH_URL}?${urlParams.toString()}`;
}

export interface ExchangeTokenParams {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  params: ExchangeTokenParams
): Promise<GitHubTokenResponse> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data as GitHubTokenResponse;
}

/**
 * Fetch user profile from GitHub API
 */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'anchorpipe',
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch GitHub user: ${error}`);
  }

  return (await response.json()) as GitHubUser;
}

/**
 * Get GitHub OAuth client ID from environment
 */
export function getGitHubClientId(): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID must be set');
  }
  return clientId;
}

/**
 * Get GitHub OAuth client secret from environment
 */
export function getGitHubClientSecret(): string {
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!secret) {
    throw new Error('GITHUB_CLIENT_SECRET must be set');
  }
  return secret;
}
