/**
 * Password Reset Service
 *
 * Handles password reset token generation, validation, and password updates.
 *
 * Story: ST-104 (Medium Priority Gap)
 */

import { prisma } from '@anchorpipe/database';
import { hashPassword } from './password';
import { randomBytes } from 'crypto';

/**
 * Password reset token expiration time (1 hour)
 */
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a secure password reset token
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a password reset token for storage
 */
export async function hashResetToken(token: string): Promise<string> {
  // Use bcrypt to hash the token (same as passwords)
  const { hash } = await import('bcryptjs');
  return await hash(token, 10); // Lower rounds for tokens (they're single-use)
}

/**
 * Verify a password reset token
 */
export async function verifyResetToken(token: string, hashedToken: string): Promise<boolean> {
  const { compare } = await import('bcryptjs');
  return await compare(token, hashedToken);
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  // Generate token
  const token = generateResetToken();
  const hashedToken = await hashResetToken(token);

  // Set expiration (1 hour from now)
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
      expiresAt: {
        gt: new Date(), // Not expired yet
      },
    },
    data: {
      usedAt: new Date(), // Mark as used
    },
  });

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Validate and consume a password reset token
 */
export async function validatePasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  // Find all unused, non-expired tokens
  const tokens = await prisma.passwordResetToken.findMany({
    where: {
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  // Try to match the token
  for (const resetToken of tokens) {
    const isValid = await verifyResetToken(token, resetToken.token);
    if (isValid) {
      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      return { valid: true, userId: resetToken.userId };
    }
  }

  return { valid: false, error: 'Invalid or expired reset token' };
}

/**
 * Update user password using reset token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Validate token
  const validation = await validatePasswordResetToken(token);
  if (!validation.valid || !validation.userId) {
    return { success: false, error: validation.error || 'Invalid token' };
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update user password in preferences
  const user = await prisma.user.findUnique({
    where: { id: validation.userId },
    select: { preferences: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const preferences = (user.preferences as Record<string, unknown>) || {};
  preferences.password = hashedPassword;

  await prisma.user.update({
    where: { id: validation.userId },
    data: { preferences: preferences as any }, // Prisma Json type requires explicit cast
  });

  return { success: true };
}

/**
 * Clean up expired password reset tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
