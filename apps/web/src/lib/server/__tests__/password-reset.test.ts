/**
 * Password Reset Service Tests
 *
 * Story: ST-104 (Medium Priority Gap)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateResetToken,
  hashResetToken,
  verifyResetToken,
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPasswordWithToken,
} from '../password-reset';
import { prisma } from '@anchorpipe/database';
import { hashPassword } from '../password';

// Mock Prisma
vi.mock('@anchorpipe/database', () => ({
  prisma: {
    passwordResetToken: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Password Reset Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateResetToken', () => {
    it('should generate a unique token', () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });
  });

  describe('hashResetToken and verifyResetToken', () => {
    it('should hash and verify tokens correctly', async () => {
      const token = generateResetToken();
      const hashed = await hashResetToken(token);

      expect(hashed).toBeTruthy();
      expect(hashed).not.toBe(token);

      const isValid = await verifyResetToken(token, hashed);
      expect(isValid).toBe(true);

      const isInvalid = await verifyResetToken('wrong-token', hashed);
      expect(isInvalid).toBe(false);
    });
  });

  describe('createPasswordResetToken', () => {
    it('should create a password reset token', async () => {
      const userId = 'user-123';
      const mockToken = generateResetToken();
      const mockHashedToken = await hashResetToken(mockToken);

      vi.mocked(prisma.passwordResetToken.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({
        id: 'token-id',
        userId,
        token: mockHashedToken,
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await createPasswordResetToken(userId);

      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should invalidate existing unused tokens', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.passwordResetToken.updateMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({
        id: 'token-id',
        userId,
        token: 'hashed-token',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      await createPasswordResetToken(userId);

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          usedAt: null,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        data: {
          usedAt: expect.any(Date),
        },
      });
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should validate a correct token', async () => {
      const token = generateResetToken();
      const hashedToken = await hashResetToken(token);
      const userId = 'user-123';

      vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([
        {
          id: 'token-id',
          userId,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          usedAt: null,
          createdAt: new Date(),
          user: {
            id: userId,
            email: 'test@example.com',
          } as any,
        },
      ]);

      vi.mocked(prisma.passwordResetToken.update).mockResolvedValue({
        id: 'token-id',
        userId,
        token: hashedToken,
        expiresAt: new Date(),
        usedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await validatePasswordResetToken(token);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(userId);
      expect(prisma.passwordResetToken.update).toHaveBeenCalled();
    });

    it('should reject an invalid token', async () => {
      vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([]);

      const result = await validatePasswordResetToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });

    it('should reject an expired token', async () => {
      const token = generateResetToken();
      const hashedToken = await hashResetToken(token);

      vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([
        {
          id: 'token-id',
          userId: 'user-123',
          token: hashedToken,
          expiresAt: new Date(Date.now() - 1000), // Expired
          usedAt: null,
          createdAt: new Date(),
          user: {} as any,
        },
      ]);

      const result = await validatePasswordResetToken(token);

      expect(result.valid).toBe(false);
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const token = generateResetToken();
      const hashedToken = await hashResetToken(token);
      const userId = 'user-123';
      const newPassword = 'NewPassword123!';
      const hashedPassword = await hashPassword(newPassword);

      // Mock token validation
      vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([
        {
          id: 'token-id',
          userId,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: null,
          createdAt: new Date(),
          user: {} as any,
        },
      ]);

      vi.mocked(prisma.passwordResetToken.update).mockResolvedValue({
        id: 'token-id',
        userId,
        token: hashedToken,
        expiresAt: new Date(),
        usedAt: new Date(),
        createdAt: new Date(),
      });

      // Mock user lookup and update
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
        preferences: {},
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: userId,
        preferences: { password: hashedPassword },
      } as any);

      const result = await resetPasswordWithToken(token, newPassword);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          preferences: expect.objectContaining({
            password: hashedPassword,
          }),
        },
      });
    });

    it('should fail with invalid token', async () => {
      vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([]);

      const result = await resetPasswordWithToken('invalid-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });
  });
});

