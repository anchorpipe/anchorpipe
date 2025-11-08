import { prisma } from '@anchorpipe/database';
import { createHash, randomBytes } from 'node:crypto';
import { encryptField } from './secrets';

// Use Prisma client directly - models should be available after regeneration
// Type assertion needed until TypeScript server picks up new Prisma types
// After restarting TypeScript server, these should be available directly
const prismaWithHmac = prisma as any;

/**
 * Common select fields for HMAC secret metadata (admin view)
 * Excludes secret values for security
 */
const HMAC_SECRET_METADATA_SELECT = {
  id: true,
  name: true,
  active: true,
  revoked: true,
  lastUsedAt: true,
  createdAt: true,
  revokedAt: true,
  expiresAt: true,
  rotatedFrom: true,
} as const;

/**
 * Type for HMAC secret metadata (admin view)
 * Excludes secret values for security
 */
export type HmacSecretMetadata = {
  id: string;
  name: string;
  active: boolean;
  revoked: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  expiresAt: Date | null;
  rotatedFrom: string | null;
};

/**
 * Generate a random HMAC secret (32 bytes, base64-encoded)
 */
export function generateHmacSecret(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Compute SHA-256 hash of a secret for lookup
 */
function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export interface CreateHmacSecretParams {
  repoId: string;
  name: string;
  secret: string;
  createdBy?: string;
  expiresAt?: Date;
}

/**
 * Create a new HMAC secret for a repository
 */
export async function createHmacSecret(
  params: CreateHmacSecretParams
): Promise<{ id: string; name: string; secret: string; createdAt: Date }> {
  const { repoId, name, secret, createdBy, expiresAt } = params;

  // Hash the secret for lookup (we can't store plaintext)
  const secretHash = hashSecret(secret);

  // Encrypt the secret value for storage
  const encryptedSecret = encryptField(secret);
  if (!encryptedSecret) {
    throw new Error('Failed to encrypt secret');
  }

  const hmacSecret = await prismaWithHmac.hmacSecret.create({
    data: {
      repoId,
      name,
      secretHash,
      secretValue: encryptedSecret,
      active: true,
      revoked: false,
      createdBy,
      expiresAt,
    },
  });

  return {
    id: hmacSecret.id,
    name: hmacSecret.name,
    secret, // Return plaintext secret only on creation
    createdAt: hmacSecret.createdAt,
  };
}

export interface RotateHmacSecretParams {
  oldSecretId: string;
  repoId: string;
  name: string;
  createdBy?: string;
  expiresAt?: Date;
}

/**
 * Rotate an HMAC secret (create new, revoke old)
 */
export async function rotateHmacSecret(
  params: RotateHmacSecretParams
): Promise<{ id: string; name: string; secret: string; createdAt: Date }> {
  const { oldSecretId, repoId, name, createdBy, expiresAt } = params;

  // Generate new secret
  const newSecret = generateHmacSecret();

  // Create new secret
  const newHmacSecret = await createHmacSecret({
    repoId,
    name,
    secret: newSecret,
    createdBy,
    expiresAt,
  });

  // Revoke old secret
  await prismaWithHmac.hmacSecret.update({
    where: { id: oldSecretId },
    data: {
      revoked: true,
      revokedAt: new Date(),
      active: false,
    },
  });

  // Update rotation reference
  await prismaWithHmac.hmacSecret.update({
    where: { id: newHmacSecret.id },
    data: {
      rotatedFrom: oldSecretId,
    },
  });

  return newHmacSecret;
}

/**
 * Revoke an HMAC secret
 */
export async function revokeHmacSecret(secretId: string): Promise<void> {
  await prismaWithHmac.hmacSecret.update({
    where: { id: secretId },
    data: {
      revoked: true,
      revokedAt: new Date(),
      active: false,
    },
  });
}

/**
 * Find active HMAC secret by repository ID and secret hash
 * Used during authentication to find the secret that matches the provided signature
 * Note: Reserved for future use when we need hash-based lookup optimization
 * Currently unused - authentication uses findActiveSecretsForRepo instead
 * @internal - Intentionally unused, reserved for future optimization
 */
async function _findActiveSecretByHash(
  repoId: string,
  secretHash: string
): Promise<{ id: string; secretValue: string } | null> {
  const secret = await prismaWithHmac.hmacSecret.findFirst({
    where: {
      repoId,
      secretHash,
      active: true,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      secretValue: true,
    },
  });

  return secret;
}

/**
 * Find active HMAC secrets for a repository (for validation attempts)
 * Returns all active secrets so we can try each one
 */
export async function findActiveSecretsForRepo(
  repoId: string
): Promise<Array<{ id: string; secretHash: string; secretValue: string }>> {
  const secrets = await prismaWithHmac.hmacSecret.findMany({
    where: {
      repoId,
      active: true,
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      secretHash: true,
      secretValue: true,
    },
    orderBy: {
      createdAt: 'desc', // Try newest secrets first
    },
  });

  return secrets;
}

/**
 * Update last used timestamp for a secret
 */
export async function updateSecretLastUsed(secretId: string): Promise<void> {
  await prismaWithHmac.hmacSecret.update({
    where: { id: secretId },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

/**
 * List HMAC secrets for a repository (admin view)
 * Returns metadata only (no secret values)
 */
export async function listHmacSecrets(repoId: string): Promise<Array<HmacSecretMetadata>> {
  const secrets = await prismaWithHmac.hmacSecret.findMany({
    where: { repoId },
    select: HMAC_SECRET_METADATA_SELECT,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return secrets;
}

/**
 * Get HMAC secret by ID (for admin operations)
 * Returns metadata only (no secret value)
 */
export async function getHmacSecretById(
  secretId: string
): Promise<(HmacSecretMetadata & { repoId: string }) | null> {
  const secret = await prismaWithHmac.hmacSecret.findUnique({
    where: { id: secretId },
    select: {
      ...HMAC_SECRET_METADATA_SELECT,
      repoId: true, // Include repoId for this query
    },
  });

  return secret;
}
