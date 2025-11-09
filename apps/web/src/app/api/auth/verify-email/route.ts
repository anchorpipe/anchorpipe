/**
 * Email Verification API
 *
 * Verify user email address with verification token.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyUserEmail } from '@/lib/server/email-verification';
import { validateRequest } from '@/lib/validation';
import { z } from 'zod';
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
 * Email verification schema
 */
const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
export async function POST(request: NextRequest) {
  try {
    const context = extractRequestContext(request);

    // Rate limiting
    const rateLimitResult = await rateLimit('auth:verify-email', request, (violationIp, key) => {
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
    const validation = await validateRequest(request, emailVerificationSchema);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Verify email using token
    const result = await verifyUserEmail(token);

    if (!result.success) {
      logger.warn('Email verification failed', {
        error: result.error,
        ipAddress: context.ipAddress,
      });

      // Audit log for failed attempt
      await writeAuditLog({
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        description: 'Email verification failed',
        metadata: {
          error: result.error,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return NextResponse.json(
        { error: result.error || 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Audit log for successful verification
    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.user,
      subjectId: result.userId!,
      description: 'Email address verified',
      metadata: {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    logger.info('Email verification completed successfully', {
      userId: result.userId,
      ipAddress: context.ipAddress,
    });

    return NextResponse.json({
      message: 'Email address verified successfully.',
      verified: true,
    });
  } catch (error) {
    logger.error('Error processing email verification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
