import { NextRequest } from 'next/server';
import { verifyHmac, extractHmacSignature, extractBearerToken } from './hmac';
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
export async function authenticateHmacRequest(
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
