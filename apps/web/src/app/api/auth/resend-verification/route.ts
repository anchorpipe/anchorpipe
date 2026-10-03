/**
 * Resend Email Verification API
 *
 * Resend email verification token to user.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { readSession } from '@/lib/server/auth';
import { createEmailVerificationToken, isEmailVerified } from '@/lib/server/email-verification';
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
 * POST /api/auth/resend-verification
 * Resend email verification token
 */
export async function POST(request: NextRequest) {
  try {
    const context = extractRequestContext(request);

    // Require authentication
    const session = await readSession();
    if (!session || !session.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.sub;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found or email not set' }, { status: 404 });
    }

    // Check if already verified
    const verified = await isEmailVerified(userId);
    if (verified) {
      return NextResponse.json({
        message: 'Email address is already verified.',
        verified: true,
      });
    }

    // Generate new verification token
    const { token: verificationToken, expiresAt } = await createEmailVerificationToken(
      userId,
      user.email
    );

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    // Queue email for sending
    try {
      const { queueEmail } = await import('@/lib/server/email-queue-processor');
      await queueEmail(userId, 'email.verification', {
        verificationUrl,
        expiresIn: '24 hours',
      });
    } catch (error) {
      logger.warn('Failed to queue email verification email', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    logger.info('Email verification token resent', {
      userId,
      email: user.email,
      expiresAt,
      // In development, log the URL (remove in production)
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
      ipAddress: context.ipAddress,
    });

    // Audit log
    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.user,
      subjectId: userId,
      description: 'Email verification token resent',
      metadata: {
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({
      message: 'Verification email has been sent. Please check your email.',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && {
        verificationToken,
        verificationUrl,
        expiresAt: expiresAt.toISOString(),
      }),
    });
  } catch (error) {
    logger.error('Error resending email verification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
