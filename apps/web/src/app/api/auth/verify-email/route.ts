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

type RequestContext = ReturnType<typeof extractRequestContext>;

async function enforceRateLimit(request: NextRequest, context: RequestContext) {
  const result = await rateLimit('auth:verify-email', request, (violationIp, key) => {
    writeAuditLog({
      action: AUDIT_ACTIONS.loginFailure,
      subject: AUDIT_SUBJECTS.security,
      description: `Rate limit violation: ${key} exceeded for IP ${violationIp}`,
      metadata: { key, ip: violationIp },
      ipAddress: violationIp,
      userAgent: context.userAgent,
    });
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: result.headers }
    );
  }

  return undefined;
}

async function parsePayload(request: NextRequest) {
  const validation = await validateRequest(request, emailVerificationSchema);
  if (!validation.success) {
    return {
      response: NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      ),
      token: null,
    };
  }

  return { response: null, token: validation.data.token };
}

async function handleVerificationFailure(error: string | undefined, context: RequestContext) {
  logger.warn('Email verification failed', {
    error,
    ipAddress: context.ipAddress,
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.loginFailure,
    subject: AUDIT_SUBJECTS.security,
    description: 'Email verification failed',
    metadata: {
      error,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return NextResponse.json(
    { error: error || 'Invalid or expired verification token' },
    { status: 400 }
  );
}

async function handleVerificationSuccess(userId: string, context: RequestContext) {
  await writeAuditLog({
    action: AUDIT_ACTIONS.configUpdated,
    subject: AUDIT_SUBJECTS.user,
    subjectId: userId,
    description: 'Email address verified',
    metadata: {},
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  logger.info('Email verification completed successfully', {
    userId,
    ipAddress: context.ipAddress,
  });

  return NextResponse.json({
    message: 'Email address verified successfully.',
    verified: true,
  });
}

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
export async function POST(request: NextRequest) {
  try {
    const context = extractRequestContext(request);

    const rateLimitResponse = await enforceRateLimit(request, context);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { response, token } = await parsePayload(request);
    if (response) {
      return response;
    }

    const result = await verifyUserEmail(token!);
    if (!result.success) {
      return handleVerificationFailure(result.error, context);
    }

    return handleVerificationSuccess(result.userId!, context);
  } catch (error) {
    logger.error('Error processing email verification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
