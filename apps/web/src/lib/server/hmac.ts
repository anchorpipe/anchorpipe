import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const HMAC_V1_VERSION = 'v1';
export const DEFAULT_HMAC_V1_CLOCK_SKEW_SECONDS = 300;

export interface HmacV1Signature {
  version: typeof HMAC_V1_VERSION;
  keyId: string;
  timestamp: number;
  nonce: string;
  bodyDigest: string;
  signature: string;
}

/** A replay store must atomically consume a nonce; expiresAt is epoch milliseconds. */
export interface ReplayStore {
  consume(nonce: string, expiresAt: number): boolean | Promise<boolean>;
}

/** Small process-local replay store intended for tests and single-process use. */
export class InMemoryReplayStore implements ReplayStore {
  private readonly entries = new Map<string, number>();

  consume(nonce: string, expiresAt: number): boolean {
    const now = Date.now();
    for (const [storedNonce, storedExpiry] of this.entries) {
      if (storedExpiry <= now) {
        this.entries.delete(storedNonce);
      }
    }
    if (this.entries.has(nonce)) {
      return false;
    }
    this.entries.set(nonce, expiresAt);
    return true;
  }

  clear(): void {
    this.entries.clear();
  }
}

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
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return false;
    }
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

/** Compute the SHA-256 digest that is bound into a v1 signature. */
export function computeBodyDigest(body: string | Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

function canonicalHmacV1Payload(
  signature: Pick<HmacV1Signature, 'keyId' | 'timestamp' | 'nonce' | 'bodyDigest'>
): string {
  return `${HMAC_V1_VERSION}\n${signature.keyId}\n${signature.timestamp}\n${signature.nonce}\n${signature.bodyDigest}`;
}

/** Create the serialized v1 signature carried by X-FR-Sig. */
export function createHmacV1Signature(
  secret: string,
  keyId: string,
  body: string | Buffer,
  options: { timestamp?: number; nonce?: string } = {}
): string {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const nonce = options.nonce ?? randomNonce();
  const bodyDigest = computeBodyDigest(body);
  const signature = computeHmac(
    secret,
    canonicalHmacV1Payload({ keyId, timestamp, nonce, bodyDigest })
  );
  return `v1;kid=${keyId};ts=${timestamp};nonce=${nonce};digest=${bodyDigest};sig=${signature}`;
}

function randomNonce(): string {
  return randomBytes(16).toString('base64url');
}

/** Parse the strict, versioned wire format without accepting ambiguous fields. */
export function parseHmacV1Signature(value: string): HmacV1Signature | null {
  const fields = value.split(';');
  if (fields.length !== 6 || fields[0] !== HMAC_V1_VERSION) {
    return null;
  }
  const parsed = new Map<string, string>();
  for (const field of fields.slice(1)) {
    const separator = field.indexOf('=');
    if (separator <= 0 || field.indexOf('=', separator + 1) !== -1) {
      return null;
    }
    const key = field.slice(0, separator);
    const fieldValue = field.slice(separator + 1);
    if (parsed.has(key) || !fieldValue) {
      return null;
    }
    parsed.set(key, fieldValue);
  }
  const keyId = parsed.get('kid');
  const timestampValue = parsed.get('ts');
  const nonce = parsed.get('nonce');
  const bodyDigest = parsed.get('digest');
  const signature = parsed.get('sig');
  if (
    !keyId ||
    !timestampValue ||
    !nonce ||
    !bodyDigest ||
    !signature ||
    !/^[A-Za-z0-9._:-]+$/.test(keyId) ||
    !/^[A-Za-z0-9._~-]+$/.test(nonce) ||
    !/^\d+$/.test(timestampValue) ||
    !/^[a-f0-9]{64}$/i.test(bodyDigest) ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return null;
  }
  const timestamp = Number(timestampValue);
  if (!Number.isSafeInteger(timestamp)) {
    return null;
  }
  return {
    version: HMAC_V1_VERSION,
    keyId,
    timestamp,
    nonce,
    bodyDigest: bodyDigest.toLowerCase(),
    signature: signature.toLowerCase(),
  };
}

/** Verify v1 fields, body binding, and timestamp before replay consumption. */
export function verifyHmacV1Signature(
  secret: string,
  body: string | Buffer,
  parsed: HmacV1Signature,
  options: { now?: number; clockSkewSeconds?: number } = {}
): boolean {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const clockSkewSeconds = options.clockSkewSeconds ?? DEFAULT_HMAC_V1_CLOCK_SKEW_SECONDS;
  if (Math.abs(now - parsed.timestamp) > clockSkewSeconds) {
    return false;
  }
  const actualDigest = computeBodyDigest(body);
  if (
    actualDigest.length !== parsed.bodyDigest.length ||
    !timingSafeEqual(Buffer.from(actualDigest, 'hex'), Buffer.from(parsed.bodyDigest, 'hex'))
  ) {
    return false;
  }
  return verifyHmac(secret, canonicalHmacV1Payload(parsed), parsed.signature);
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
