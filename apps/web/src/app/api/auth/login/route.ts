import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@anchorpipe/database';
import { createSessionJwt, setSessionCookie } from '@/lib/server/auth';
import { verifyPassword } from '@/lib/server/password';
import { validateRequest } from '@/lib/validation';
import { loginSchema } from '@/lib/schemas/auth';
import {
  checkBruteForceLock,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/server/brute-force';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/server/audit-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const context = extractRequestContext(request as unknown as NextRequest);
    const ip = context.ipAddress || 'unknown';

    // Validate request body with Zod schema
    const validation = await validateRequest(request, loginSchema);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Check brute force lock
    const bruteForceCheck = checkBruteForceLock(ip, email || undefined);
    if (bruteForceCheck.locked) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        description: `Brute force lock: Account locked due to repeated failed attempts`,
        metadata: { email, ip, retryAfter: bruteForceCheck.retryAfter },
        ipAddress: ip,
        userAgent: context.userAgent,
      });
      return NextResponse.json(
        {
          error:
            'Account temporarily locked due to repeated failed login attempts. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(bruteForceCheck.retryAfter || 900),
          },
        }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      // Record failed attempt for brute force tracking
      const bruteForceResult = recordFailedAttempt(ip, email || undefined);
      await writeAuditLog({
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        description: 'Failed login - user not found.',
        metadata: { email },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      // Don't reveal if user exists (security best practice)
      const headers = bruteForceResult.locked
        ? {
            'Retry-After': String(bruteForceResult.retryAfter || 900),
          }
        : undefined;
      const responseInit = headers ? { status: 401, headers } : { status: 401 };
      return NextResponse.json({ error: 'Invalid credentials' }, responseInit);
    }

    // Verify password
    const passwordHash = (user.preferences as { passwordHash?: string } | null)?.passwordHash;
    if (!passwordHash) {
      await writeAuditLog({
        actorId: user.id,
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.user,
        subjectId: user.id,
        description: 'Failed login - password not set.',
        metadata: { email },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      // User exists but no password set (e.g., OAuth-only user)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
      // Record failed attempt for brute force tracking
      const bruteForceResult = recordFailedAttempt(ip, email || undefined);
      await writeAuditLog({
        actorId: user.id,
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.user,
        subjectId: user.id,
        description: 'Failed login - invalid password.',
        metadata: { email },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      const headers = bruteForceResult.locked
        ? {
            'Retry-After': String(bruteForceResult.retryAfter || 900),
          }
        : undefined;
      const responseInit = headers ? { status: 401, headers } : { status: 401 };
      return NextResponse.json({ error: 'Invalid credentials' }, responseInit);
    }

    // Successful login - clear brute force tracking
    clearFailedAttempts(ip, email || undefined);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const token = await createSessionJwt({ sub: user.id, email: user.email || undefined });
    await setSessionCookie(token);

    await writeAuditLog({
      actorId: user.id,
      action: AUDIT_ACTIONS.loginSuccess,
      subject: AUDIT_SUBJECTS.user,
      subjectId: user.id,
      description: 'User logged in successfully.',
      metadata: { email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
