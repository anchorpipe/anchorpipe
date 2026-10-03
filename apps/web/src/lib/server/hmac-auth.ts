import { NextRequest } from 'next/server';
import {
  DEFAULT_HMAC_V1_CLOCK_SKEW_SECONDS,
  InMemoryReplayStore,
  parseHmacV1Signature,
  ReplayStore,
  extractHmacSignature,
  extractBearerToken,
  verifyHmac,
  verifyHmacV1Signature,
} from './hmac';
import { findActiveSecretsForRepo, updateSecretLastUsed } from './hmac-secrets';
import { decryptField } from './secrets';
import {
  writeAuditLog,
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
} from './audit-service';

export interface HmacAuthResult {
  success: boolean;
  repoId?: string;
  secretId?: string;
  error?: string;
}

/**
 * Authenticate request using HMAC signature
 * Validates Bearer token (repo ID) and X-FR-Sig header (HMAC signature)
 */
export async function authenticateLegacyHmacRequest(
  request: NextRequest,
  body: string | Buffer
): Promise<HmacAuthResult> {
  const context = extractRequestContext(request);

  // Extract Bearer token (should be repo ID)
  const repoToken = extractBearerToken(request.headers);
  if (!repoToken) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      description: 'HMAC authentication failed: missing Bearer token',
      metadata: { reason: 'missing_token' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return {
      success: false,
      error: 'Missing Authorization header with Bearer token',
    };
  }

  // Extract HMAC signature
  const signature = extractHmacSignature(request.headers);
  if (!signature) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoToken,
      description: 'HMAC authentication failed: missing X-FR-Sig header',
      metadata: { reason: 'missing_signature', repoId: repoToken },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return {
      success: false,
      error: 'Missing X-FR-Sig header',
    };
  }

  // Find active secrets for this repository
  const secrets = await findActiveSecretsForRepo(repoToken);
  if (secrets.length === 0) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoToken,
      description: 'HMAC authentication failed: no active secrets found',
      metadata: { reason: 'no_secrets', repoId: repoToken },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return {
      success: false,
      error: 'No active HMAC secrets found for repository',
    };
  }

  // Try each active secret until we find a match
  for (const secret of secrets) {
    const decryptedSecret = decryptField(secret.secretValue);
    if (!decryptedSecret) {
      continue; // Skip if decryption fails
    }

    const isValid = verifyHmac(decryptedSecret, body, signature);
    if (isValid) {
      // Update last used timestamp
      await updateSecretLastUsed(secret.id);

      // Log successful authentication
      await writeAuditLog({
        action: AUDIT_ACTIONS.hmacAuthSuccess,
        subject: AUDIT_SUBJECTS.security,
        subjectId: repoToken,
        description: 'HMAC authentication successful',
        metadata: {
          repoId: repoToken,
          secretId: secret.id,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        success: true,
        repoId: repoToken,
        secretId: secret.id,
      };
    }
  }

  // No matching secret found
  await writeAuditLog({
    action: AUDIT_ACTIONS.hmacAuthFailure,
    subject: AUDIT_SUBJECTS.security,
    subjectId: repoToken,
    description: 'HMAC authentication failed: invalid signature',
    metadata: {
      reason: 'invalid_signature',
      repoId: repoToken,
      secretsTried: secrets.length,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    success: false,
    error: 'Invalid HMAC signature',
  };
}

/**
 * Compatibility alias for the unversioned X-FR-Sig scheme. New routes must use
 * authenticateV1HmacRequest instead; this remains for the legacy endpoint only.
 */
export const authenticateHmacRequest = authenticateLegacyHmacRequest;

export interface HmacV1AuthOptions {
  replayStore?: ReplayStore;
  now?: number;
  clockSkewSeconds?: number;
}

const defaultReplayStore = new InMemoryReplayStore();

/** Authenticate the versioned v1 ingestion signature. */
export async function authenticateV1HmacRequest(
  request: NextRequest,
  body: string | Buffer,
  options: HmacV1AuthOptions = {}
): Promise<HmacAuthResult> {
  const context = extractRequestContext(request);
  const repoToken = extractBearerToken(request.headers);
  const signatureValue = extractHmacSignature(request.headers);
  const parsedSignature = signatureValue ? parseHmacV1Signature(signatureValue) : null;

  if (!repoToken || !signatureValue || !parsedSignature) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoToken || undefined,
      description: 'HMAC v1 authentication failed: malformed or missing credentials',
      metadata: {
        reason: !repoToken
          ? 'missing_token'
          : !signatureValue
            ? 'missing_signature'
            : 'malformed_signature',
        repoId: repoToken,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return { success: false, error: 'Invalid v1 HMAC credentials' };
  }

  const clockSkewSeconds = options.clockSkewSeconds ?? DEFAULT_HMAC_V1_CLOCK_SKEW_SECONDS;
  const secrets = await findActiveSecretsForRepo(repoToken);
  const key = secrets.find((secret) => secret.id === parsedSignature.keyId);
  if (!key) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoToken,
      description: 'HMAC v1 authentication failed: unknown key id',
      metadata: { reason: 'unknown_key_id', repoId: repoToken, keyId: parsedSignature.keyId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return { success: false, error: 'Unknown HMAC key id' };
  }

  const decryptedSecret = decryptField(key.secretValue);
  const valid = decryptedSecret
    ? verifyHmacV1Signature(decryptedSecret, body, parsedSignature, {
        now: options.now,
        clockSkewSeconds,
      })
    : false;
  if (!valid) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoToken,
      description: 'HMAC v1 authentication failed: invalid signature',
      metadata: { reason: 'invalid_signature', repoId: repoToken, keyId: parsedSignature.keyId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return { success: false, error: 'Invalid v1 HMAC signature' };
  }

  const replayStore = options.replayStore ?? defaultReplayStore;
  const verificationNowMilliseconds = options.now === undefined ? Date.now() : options.now * 1000;
  const replayAccepted = await replayStore.consume(
    parsedSignature.nonce,
    verificationNowMilliseconds + clockSkewSeconds * 1000
  );
  if (!replayAccepted) {
    await writeAuditLog({
      action: AUDIT_ACTIONS.hmacAuthFailure,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoToken,
      description: 'HMAC v1 authentication failed: duplicate nonce',
      metadata: { reason: 'duplicate_nonce', repoId: repoToken, keyId: parsedSignature.keyId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return { success: false, error: 'Duplicate HMAC nonce' };
  }

  await updateSecretLastUsed(key.id);
  await writeAuditLog({
    action: AUDIT_ACTIONS.hmacAuthSuccess,
    subject: AUDIT_SUBJECTS.security,
    subjectId: repoToken,
    description: 'HMAC v1 authentication successful',
    metadata: { repoId: repoToken, secretId: key.id, keyId: parsedSignature.keyId },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
  return { success: true, repoId: repoToken, secretId: key.id };
}
