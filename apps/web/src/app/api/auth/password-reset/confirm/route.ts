/**
 * Password Reset Confirmation API
 *
 * Confirm password reset and update user password.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordWithToken } from '@/lib/server/password-reset';
import { validateRequest } from '@/lib/validation';
import { z } from 'zod';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/server/audit-service';
import { logger } from '@/lib/server/logger';
import { passwordSchema } from '@/lib/schemas/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Password reset confirmation schema
 */
const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

/**
 * POST /api/auth/password-reset/confirm
 * Confirm password reset and update password
 */
export async function POST(request: NextRequest) {
  try {
    const context = extractRequestContext(request);

    // Validate request body
    const validation = await validateRequest(request, passwordResetConfirmSchema);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Reset password using token
    const result = await resetPasswordWithToken(token, password);

    if (!result.success) {
      logger.warn('Password reset failed', {
        error: result.error,
        ipAddress: context.ipAddress,
      });

      // Audit log for failed attempt
      await writeAuditLog({
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        description: 'Password reset confirmation failed',
        metadata: {
          error: result.error,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return NextResponse.json(
        { error: result.error || 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Audit log for successful reset
    await writeAuditLog({
      action: AUDIT_ACTIONS.configUpdated,
      subject: AUDIT_SUBJECTS.user,
      description: 'Password reset completed',
      metadata: {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    logger.info('Password reset completed successfully', {
      ipAddress: context.ipAddress,
    });

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    logger.error('Error processing password reset confirmation', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
