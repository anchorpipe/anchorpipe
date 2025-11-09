/**
 * Password Reset Request API
 *
 * Request a password reset token for a user account.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

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
 * POST /api/auth/password-reset/request
 * Request a password reset token
 */
export async function POST(request: NextRequest) {
  try {
    const context = extractRequestContext(request);

    // Rate limiting
    const rateLimitResult = await rateLimit('auth:password-reset', request, (violationIp, key) => {
      writeAuditLog({
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        description: `Rate limit violation: ${key} exceeded for IP ${violationIp}`,
        metadata: { key, ip: violationIp },
        ipAddress: violationIp,
        userAgent: context.userAgent,
      });
    });

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

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
    });

    // Always return success (don't reveal if email exists)
    // This prevents email enumeration attacks
    if (!user) {
      logger.info('Password reset requested for non-existent email', {
        email,
        ipAddress: context.ipAddress,
      });
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Check if user has a password (not OAuth-only account)
    const preferences = (user.preferences as Record<string, unknown>) || {};
    if (!preferences.password) {
      logger.info('Password reset requested for OAuth-only account', {
        userId: user.id,
        email,
        ipAddress: context.ipAddress,
      });
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const { token, expiresAt } = await createPasswordResetToken(user.id);

    // TODO: Send email with reset link when email infrastructure is ready
    // For now, log the token (in development) or queue for email service
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    logger.info('Password reset token generated', {
      userId: user.id,
      email,
      expiresAt,
      // In development, log the URL (remove in production)
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
      ipAddress: context.ipAddress,
    });

    // Queue email for future email service (similar to DSR service)
    // For now, we'll just log it
    // TODO: Integrate with email service when available

    // Audit log
    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.user,
      subjectId: user.id,
      description: 'Password reset requested',
      metadata: {
        email,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Return success (don't reveal if email exists)
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && {
        token,
        resetUrl,
        expiresAt: expiresAt.toISOString(),
      }),
    });
  } catch (error) {
    logger.error('Error processing password reset request', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
