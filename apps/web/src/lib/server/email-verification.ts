/**
 * Email Verification Service
 *
 * Handles email verification token generation, validation, and email verification.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

import { prisma } from '@anchorpipe/database';
import { randomBytes } from 'crypto';

/**
 * Email verification token expiration time (24 hours)
 */
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a secure email verification token
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create an email verification token for a user
 */
export async function createEmailVerificationToken(
  userId: string,
  email: string
): Promise<{ token: string; expiresAt: Date }> {
  // Generate token
  const token = generateVerificationToken();

  // Set expiration (24 hours from now)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

  // Invalidate any existing unused tokens for this user/email
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: email,
      expires: {
        gt: new Date(), // Not expired yet
      },
    },
  });

  // Create new token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Validate and consume an email verification token
 */
export async function validateEmailVerificationToken(
  token: string
): Promise<{ valid: boolean; email?: string; error?: string }> {
  // Find token
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return { valid: false, error: 'Invalid verification token' };
  }

  // Check if expired
  if (verificationToken.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({
      where: { token },
    });
    return { valid: false, error: 'Verification token has expired' };
  }

  // Delete token (single-use)
  await prisma.verificationToken.delete({
    where: { token },
  });

  return { valid: true, email: verificationToken.identifier };
}

/**
 * Verify user's email address
 */
export async function verifyUserEmail(
  token: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Validate token
  const validation = await validateEmailVerificationToken(token);
  if (!validation.valid || !validation.email) {
    return { success: false, error: validation.error || 'Invalid token' };
  }

  // Find user by email
  const user = await prisma.user.findFirst({
    where: { email: validation.email },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Update user preferences to mark email as verified
  const preferences = (user.preferences as Record<string, unknown>) || {};
  preferences.emailVerified = true;
  preferences.emailVerifiedAt = new Date().toISOString();

  await prisma.user.update({
    where: { id: user.id },
    data: { preferences: preferences as any }, // Prisma Json type requires explicit cast
  });

  return { success: true, userId: user.id };
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  if (!user || !user.preferences) {
    return false;
  }

  const preferences = user.preferences as Record<string, unknown>;
  return Boolean(preferences.emailVerified);
}

/**
 * Clean up expired verification tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.verificationToken.deleteMany({
    where: {
      expires: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
