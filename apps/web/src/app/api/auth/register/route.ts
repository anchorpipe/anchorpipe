import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@anchorpipe/database';
import { createSessionJwt, setSessionCookie } from '@/lib/server/auth';
import { hashPassword } from '@/lib/server/password';
import { validateRequest } from '@/lib/validation';
import { registerSchema } from '@/lib/schemas/auth';
import { rateLimit } from '@/lib/server/rate-limit';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/server/audit-service';
import { createEmailVerificationToken } from '@/lib/server/email-verification';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const context = extractRequestContext(request as unknown as NextRequest);

    // Rate limiting with violation logging
    const rateLimitResult = await rateLimit('auth:register', request, (violationIp, key) => {
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

    // Validate request body with Zod schema
    const validation = await validateRequest(request, registerSchema);
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

    // Check if user already exists
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      await writeAuditLog({
        actorId: existing.id,
        action: AUDIT_ACTIONS.loginFailure,
        subject: AUDIT_SUBJECTS.security,
        subjectId: existing.id,
        description: 'Registration blocked: email already exists.',
        metadata: { email },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409, headers: rateLimitResult.headers }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        // Store password hash in preferences for now (in future, use Account model with provider='password')
        preferences: {
          passwordHash: hashedPassword,
          emailVerified: false, // Email not verified yet
        },
      },
    });

    // Generate email verification token
    const { token: verificationToken, expiresAt } = await createEmailVerificationToken(
      user.id,
      email
    );

    // TODO: Send verification email when email infrastructure is ready
    // For now, log the token (in development) or queue for email service
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    logger.info('Email verification token generated', {
      userId: user.id,
      email,
      expiresAt,
      // In development, log the URL (remove in production)
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
      ipAddress: context.ipAddress,
    });

    // Queue email for future email service (similar to DSR service)
    // For now, we'll just log it
    // TODO: Integrate with email service when available

    // Create session
    const token = await createSessionJwt({ sub: user.id, email: user.email || undefined });
    await setSessionCookie(token);

    await writeAuditLog({
      actorId: user.id,
      action: AUDIT_ACTIONS.userCreated,
      subject: AUDIT_SUBJECTS.user,
      subjectId: user.id,
      description: 'User account registered.',
      metadata: {
        email,
        emailVerificationRequired: true,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        // In development, include the token for testing
        ...(process.env.NODE_ENV === 'development' && {
          verificationToken,
          verificationUrl,
          expiresAt: expiresAt.toISOString(),
        }),
      },
      { status: 201, headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
