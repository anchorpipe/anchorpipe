import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Compute HMAC-SHA256 signature of a payload
 * @param secret - The secret key (plaintext)
 * @param payload - The payload to sign (request body as string or Buffer)
 * @returns Hex-encoded HMAC signature
 */
export function computeHmac(secret: string, payload: string | Buffer): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verify HMAC signature using constant-time comparison
 * @param secret - The secret key (plaintext)
 * @param payload - The payload that was signed
 * @param signature - The signature to verify (hex-encoded)
 * @returns true if signature is valid, false otherwise
 */
export function verifyHmac(secret: string, payload: string | Buffer, signature: string): boolean {
  try {
    const expectedSignature = computeHmac(secret, payload);
    // Use constant-time comparison to prevent timing attacks
    if (expectedSignature.length !== signature.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
  } catch (error) {
    // Invalid signature format or other error
    return false;
  }
}

/**
 * Extract HMAC signature from request headers
 * @param headers - Request headers
 * @returns The signature value or null if not present
 */
export function extractHmacSignature(headers: Headers): string | null {
  return headers.get('x-fr-sig') || headers.get('X-FR-Sig') || null;
}

/**
 * Extract Bearer token from Authorization header
 * @param headers - Request headers
 * @returns The token value or null if not present
 */
export function extractBearerToken(headers: Headers): string | null {
  const authHeader = headers.get('authorization') || headers.get('Authorization');
  if (!authHeader) {
    return null;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
