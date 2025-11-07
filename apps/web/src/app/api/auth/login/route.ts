import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@anchorpipe/database';
import { createSessionJwt, setSessionCookie } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { validateRequest } from '@/lib/validation';
import { loginSchema } from '@/lib/schemas/auth';
import { rateLimit } from '@/lib/rate-limit';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/audit-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit('auth:login', request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Validate request body with Zod schema
    const validation = await validateRequest(request, loginSchema);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.error,
          details: validation.error.details,
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const { email, password } = validation.data;
    const context = extractRequestContext(request as unknown as NextRequest);

    // Find user
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        description: 'Failed login - user not found.',
        metadata: { email },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      // Don't reveal if user exists (security best practice)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: rateLimitResult.headers }
      );
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
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
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
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

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

    return NextResponse.json({ ok: true }, { headers: rateLimitResult.headers });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
