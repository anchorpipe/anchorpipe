import { NextResponse } from 'next/server';
import { PrismaClient } from '@anchorpipe/database';
import { createSessionJwt, setSessionCookie } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { validateEmail } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

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

    const body = await request.json();
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(body?.password || '');

    // Validation
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json(
        { error: emailError },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    if (!password || password.length === 0) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      // Don't reveal if user exists (security best practice)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    // Verify password
    const passwordHash = (user.preferences as { passwordHash?: string } | null)?.passwordHash;
    if (!passwordHash) {
      // User exists but no password set (e.g., OAuth-only user)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
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

    return NextResponse.json({ ok: true }, { headers: rateLimitResult.headers });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
