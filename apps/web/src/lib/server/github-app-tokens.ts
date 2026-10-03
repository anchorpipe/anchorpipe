/**
 * GitHub App Token Generation
 *
 * Generates installation access tokens for GitHub App API calls.
 *
 * Story: ST-301
 */

import { SignJWT, importPKCS8 } from 'jose';
import { logger } from './logger';

/**
 * Get GitHub App ID from environment
 */
function getGitHubAppId(): number {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error('GITHUB_APP_ID environment variable is not set');
  }
  return parseInt(appId, 10);
}

/**
 * Get GitHub App private key from environment
 */
function getGitHubAppPrivateKey(): string {
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('GITHUB_APP_PRIVATE_KEY environment variable is not set');
  }

  // Handle both PEM format and base64-encoded keys
  // If it's base64, decode it
  if (!privateKey.includes('-----BEGIN')) {
    try {
      return Buffer.from(privateKey, 'base64').toString('utf-8');
    } catch {
      // If decoding fails, assume it's already in PEM format
      return privateKey;
    }
  }

  return privateKey;
}

/**
 * In-memory token cache
 * Tokens expire after 1 hour (GitHub's default)
 */
interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Generate a JWT for GitHub App authentication
 */
async function generateAppJWT(): Promise<string> {
  const appId = getGitHubAppId();
  const privateKeyPem = getGitHubAppPrivateKey();

  // Import the private key
  const privateKey = await importPKCS8(privateKeyPem, 'RS256');

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setIssuer(appId.toString())
    .setExpirationTime(now + 600) // 10 minutes (GitHub allows up to 10 minutes)
    .sign(privateKey);

  return jwt;
}

/**
 * Get installation access token
 * Caches tokens until expiration (1 hour)
 */
export async function getInstallationToken(installationId: bigint): Promise<string> {
  const cacheKey = installationId.toString();

  // Check cache
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    // Generate JWT for app authentication
    const jwt = await generateAppJWT();

    // Exchange JWT for installation token
    const response = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get installation token: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      token: string;
      expires_at: string;
    };

    // Cache token (expires 1 hour before actual expiration for safety)
    const expiresAt = new Date(data.expires_at).getTime() - 60 * 1000; // 1 minute buffer
    tokenCache.set(cacheKey, {
      token: data.token,
      expiresAt,
    });

    logger.info('GitHub App installation token generated', {
      installationId: installationId.toString(),
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return data.token;
  } catch (error) {
    logger.error('Failed to generate GitHub App installation token', {
      installationId: installationId.toString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Clear cached token for an installation
 * Useful when installation is deleted or permissions change
 */
export function clearInstallationTokenCache(installationId: bigint): void {
  const cacheKey = installationId.toString();
  tokenCache.delete(cacheKey);
  logger.info('GitHub App installation token cache cleared', {
    installationId: installationId.toString(),
  });
}

/**
 * Clear all cached tokens
 * Useful for testing or when app credentials change
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
  logger.info('All GitHub App installation token caches cleared');
}
