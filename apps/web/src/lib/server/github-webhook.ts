/**
 * GitHub Webhook Signature Verification
 *
 * Verifies GitHub webhook signatures using HMAC-SHA256
 *
 * Story: ST-301
 */

import { createHmac } from 'crypto';

/**
 * Get GitHub App webhook secret from environment
 */
function getGitHubAppWebhookSecret(): string {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('GITHUB_APP_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Verify GitHub webhook signature
 *
 * GitHub sends webhook signatures in the format: sha256=<hexdigest>
 */
export async function verifyGitHubWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  try {
    const secret = getGitHubAppWebhookSecret();

    // Extract hex digest from signature (format: sha256=<hexdigest>)
    const expectedSignature = signature.replace(/^sha256=/, '');

    // Compute HMAC-SHA256
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    const computedSignature = hmac.digest('hex');

    // Compare signatures using constant-time comparison
    return constantTimeEqual(computedSignature, expectedSignature);
  } catch (error) {
    console.error('GitHub webhook signature verification error:', error);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

