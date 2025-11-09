/**
 * Password Reset Request API
 *
 * Request a password reset token for a user account.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

// cSpell:ignore anchorpipe
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { z } from 'zod';
import { createPasswordResetToken } from '@/lib/server/password-reset';
import { validateRequest } from '@/lib/validation';
import { emailSchema } from '@/lib/schemas/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/server/audit-service';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check rate limiting for password reset request
 */
async function checkRateLimit(
  request: NextRequest,
  context: { userAgent: string | null }
): Promise<{ allowed: boolean; headers?: Record<string, string> }> {
  return await rateLimit('auth:password-reset', request, (violationIp, key) => {
    writeAuditLog({
      action: AUDIT_ACTIONS.loginFailure,
      subject: AUDIT_SUBJECTS.security,
      description: `Rate limit violation: ${key} exceeded for IP ${violationIp}`,
      metadata: { key, ip: violationIp },
      ipAddress: violationIp,
      userAgent: context.userAgent,
    });
  });
}

/**
 * Validate email and find user
 */
async function findUserForPasswordReset(
  email: string
): Promise<{ user: { id: string; preferences: unknown } | null; hasPassword: boolean }> {
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    return { user: null, hasPassword: false };
  }

  const preferences = (user.preferences as Record<string, unknown>) || {};
  const hasPassword = Boolean(preferences.password);

  return { user, hasPassword };
}

/**
 * Generate password reset token and prepare response
 */
async function generatePasswordResetResponse(
  userId: string,
  email: string,
  context: { ipAddress: string | null; userAgent: string | null }
): Promise<{ message: string; devData?: Record<string, unknown> }> {
  const { token, expiresAt } = await createPasswordResetToken(userId);
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  logger.info('Password reset token generated', {
    userId,
    email,
    expiresAt,
    ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    ipAddress: context.ipAddress,
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.configUpdated,
    subject: AUDIT_SUBJECTS.user,
    subjectId: userId,
    description: 'Password reset requested',
    metadata: {
      email,
      expiresAt: expiresAt.toISOString(),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    message: 'If an account with that email exists, a password reset link has been sent.',
    ...(process.env.NODE_ENV === 'development' && {
      devData: {
        token,
        resetUrl,
        expiresAt: expiresAt.toISOString(),
      },
    }),
  };
}

/**
 * POST /api/auth/password-reset/request
 * Request a password reset token
 */
export async function POST(request: NextRequest) {
  try {
    const context = extractRequestContext(request);

    // Rate limiting
    const rateLimitResult = await checkRateLimit(request, context);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Validate request body
    const validation = await validateRequest(request, z.object({ email: emailSchema }));
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Find user and check if they have a password
    const { user, hasPassword } = await findUserForPasswordReset(email);

    // Always return success (don't reveal if email exists) - prevents email enumeration
    if (!user || !hasPassword) {
      logger.info('Password reset requested for invalid account', {
        email,
        hasUser: Boolean(user),
        hasPassword,
        ipAddress: context.ipAddress,
      });
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token and prepare response
    const response = await generatePasswordResetResponse(user.id, email, context);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error processing password reset request', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
