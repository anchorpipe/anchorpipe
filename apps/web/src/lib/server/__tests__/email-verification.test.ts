import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateVerificationToken,
  createEmailVerificationToken,
  validateEmailVerificationToken,
  verifyUserEmail,
  isEmailVerified,
} from '../email-verification';

const mockPrisma = vi.hoisted(() => ({
  verificationToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn((size: number) => Buffer.from('a'.repeat(size * 2))),
}));

describe('email-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('generates a hex token', () => {
      const token = generateVerificationToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('createEmailVerificationToken', () => {
    it('creates verification token and invalidates old ones', async () => {
      const now = new Date();
      mockPrisma.verificationToken.deleteMany.mockResolvedValueOnce({ count: 2 });
      mockPrisma.verificationToken.create.mockResolvedValueOnce({
        token: 'token-123',
        expires: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });

      const result = await createEmailVerificationToken('user-1', 'test@example.com');

      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: 'test@example.com',
          token: expect.any(String),
          expires: expect.any(Date),
        },
      });
    });
  });

  describe('validateEmailVerificationToken', () => {
    it('returns error for invalid token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce(null);

      const result = await validateEmailVerificationToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid verification token');
    });

    it('returns error for expired token', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce({
        token: 'expired-token',
        identifier: 'test@example.com',
        expires: expiredDate,
      });
      mockPrisma.verificationToken.delete.mockResolvedValueOnce({});

      const result = await validateEmailVerificationToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Verification token has expired');
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalled();
    });

    it('returns valid result for valid token', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce({
        token: 'valid-token',
        identifier: 'test@example.com',
        expires: futureDate,
      });
      mockPrisma.verificationToken.delete.mockResolvedValueOnce({});

      const result = await validateEmailVerificationToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalled();
    });
  });

  describe('verifyUserEmail', () => {
    it('verifies user email and marks as verified', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce({
        token: 'valid-token',
        identifier: 'test@example.com',
        expires: futureDate,
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: false,
      });
      mockPrisma.user.update.mockResolvedValueOnce({
        id: 'user-1',
        emailVerified: true,
      });
      mockPrisma.verificationToken.delete.mockResolvedValueOnce({});

      const result = await verifyUserEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: { emailVerified: true },
      });
    });

    it('returns error when token is invalid', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce(null);

      const result = await verifyUserEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification token');
    });
  });

  describe('isEmailVerified', () => {
    it('returns true when email is verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        emailVerified: true,
      });

      const result = await isEmailVerified('user-1');

      expect(result).toBe(true);
    });

    it('returns false when email is not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        emailVerified: false,
      });

      const result = await isEmailVerified('user-1');

      expect(result).toBe(false);
    });

    it('returns false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await isEmailVerified('user-1');

      expect(result).toBe(false);
    });
  });
});

