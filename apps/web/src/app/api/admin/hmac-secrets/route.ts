import { NextRequest, NextResponse } from 'next/server';
import { getAuthzContext } from '@/lib/server/authz';
import { getUserRepoRole } from '@/lib/server/rbac-service';
import { RepoRole } from '@/lib/rbac';
import {
  createHmacSecret,
  rotateHmacSecret,
  revokeHmacSecret,
  listHmacSecrets,
  getHmacSecretById,
  generateHmacSecret,
} from '@/lib/server/hmac-secrets';
import {
  writeAuditLog,
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
} from '@/lib/server/audit-service';
import { validateRequest } from '@/lib/validation';
import { z } from 'zod';

export const runtime = 'nodejs';

const createSecretSchema = z.object({
  repoId: z.string().uuid(),
  name: z.string().min(1).max(255),
  expiresAt: z.string().datetime().optional(),
});

const rotateSecretSchema = z.object({
  oldSecretId: z.string().uuid(),
  repoId: z.string().uuid(),
  name: z.string().min(1).max(255),
  expiresAt: z.string().datetime().optional(),
});

const revokeSecretSchema = z.object({
  secretId: z.string().uuid(),
});

/**
 * GET /api/admin/hmac-secrets?repoId=<repo_id>
 * List HMAC secrets for a repository (admin-only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get('repoId');
  if (!repoId) {
    return NextResponse.json({ error: 'repoId query parameter is required' }, { status: 400 });
  }

  const authz = await getAuthzContext(request, repoId);
  if (!authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const role = await getUserRepoRole(authz.userId, repoId);
  if (role !== RepoRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const secrets = await listHmacSecrets(repoId);
    return NextResponse.json({ secrets });
  } catch (error) {
    console.error('Error listing HMAC secrets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list secrets';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/admin/hmac-secrets
 * Create a new HMAC secret (admin-only)
 */
export async function POST(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, createSecretSchema);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: validation.error.error,
        details: validation.error.details,
      },
      { status: 400 }
    );
  }

  const { repoId, name, expiresAt } = validation.data;

  const authz = await getAuthzContext(request, repoId);
  if (!authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const role = await getUserRepoRole(authz.userId, repoId);
  if (role !== RepoRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    // Generate secret
    const secret = generateHmacSecret();

    // Create secret
    const result = await createHmacSecret({
      repoId,
      name,
      secret,
      createdBy: authz.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    // Log audit event
    const context = extractRequestContext(request);
    await writeAuditLog({
      actorId: authz.userId,
      action: AUDIT_ACTIONS.hmacSecretCreated,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoId,
      description: `HMAC secret created: ${name}`,
      metadata: {
        secretId: result.id,
        repoId,
        name,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({
      id: result.id,
      name: result.name,
      secret: result.secret, // Return plaintext secret only on creation
      createdAt: result.createdAt,
      message:
        'Secret created successfully. Store this secret securely - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating HMAC secret:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create secret';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * PUT /api/admin/hmac-secrets
 * Rotate an HMAC secret (admin-only)
 */
export async function PUT(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, rotateSecretSchema);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: validation.error.error,
        details: validation.error.details,
      },
      { status: 400 }
    );
  }

  const { oldSecretId, repoId, name, expiresAt } = validation.data;

  const authz = await getAuthzContext(request, repoId);
  if (!authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const role = await getUserRepoRole(authz.userId, repoId);
  if (role !== RepoRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    // Rotate secret
    const result = await rotateHmacSecret({
      oldSecretId,
      repoId,
      name,
      createdBy: authz.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    // Log audit event
    const context = extractRequestContext(request);
    await writeAuditLog({
      actorId: authz.userId,
      action: AUDIT_ACTIONS.hmacSecretRotated,
      subject: AUDIT_SUBJECTS.security,
      subjectId: repoId,
      description: `HMAC secret rotated: ${name}`,
      metadata: {
        newSecretId: result.id,
        oldSecretId,
        repoId,
        name,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({
      id: result.id,
      name: result.name,
      secret: result.secret, // Return plaintext secret only on rotation
      createdAt: result.createdAt,
      message:
        'Secret rotated successfully. Store this secret securely - it will not be shown again.',
    });
  } catch (error) {
    console.error('Error rotating HMAC secret:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to rotate secret';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/hmac-secrets
 * Revoke an HMAC secret (admin-only)
 */
export async function DELETE(request: NextRequest) {
  // Validate request body
  const validation = await validateRequest(request, revokeSecretSchema);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: validation.error.error,
        details: validation.error.details,
      },
      { status: 400 }
    );
  }

  const { secretId } = validation.data;

  // Get secret to check repoId
  const secret = await getHmacSecretById(secretId);
  if (!secret) {
    return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
  }

  const authz = await getAuthzContext(request, secret.repoId);
  if (!authz) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const role = await getUserRepoRole(authz.userId, secret.repoId);
  if (role !== RepoRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    // Revoke secret
    await revokeHmacSecret(secretId);

    // Log audit event
    const context = extractRequestContext(request);
    await writeAuditLog({
      actorId: authz.userId,
      action: AUDIT_ACTIONS.hmacSecretRevoked,
      subject: AUDIT_SUBJECTS.security,
      subjectId: secret.repoId,
      description: `HMAC secret revoked: ${secret.name}`,
      metadata: {
        secretId,
        repoId: secret.repoId,
        name: secret.name,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({ message: 'Secret revoked successfully' });
  } catch (error) {
    console.error('Error revoking HMAC secret:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to revoke secret';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
