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
    const context = extractRequestContext(request as unknown as NextRequest);

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
        },
      },
    });

    // Create session
    const token = await createSessionJwt({ sub: user.id, email: user.email || undefined });
    await setSessionCookie(token);

    await writeAuditLog({
      actorId: user.id,
      action: AUDIT_ACTIONS.userCreated,
      subject: AUDIT_SUBJECTS.user,
      subjectId: user.id,
      description: 'User account registered.',
      metadata: { email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({ ok: true }, { status: 201, headers: rateLimitResult.headers });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
