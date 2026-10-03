import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../password';
import { hash, compare } from 'bcryptjs';

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('password', () => {
  describe('hashPassword', () => {
    it('hashes password with bcrypt', async () => {
      const mockHash = vi.mocked(hash);
      mockHash.mockResolvedValueOnce('hashed-password' as never);

      const result = await hashPassword('plain-password');

      expect(result).toBe('hashed-password');
      expect(mockHash).toHaveBeenCalledWith('plain-password', 12);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password', async () => {
      const mockCompare = vi.mocked(compare);
      mockCompare.mockResolvedValueOnce(true as never);

      const result = await verifyPassword('plain-password', 'hashed-password');

      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalledWith('plain-password', 'hashed-password');
    });

    it('returns false for non-matching password', async () => {
      const mockCompare = vi.mocked(compare);
      mockCompare.mockResolvedValueOnce(false as never);

      const result = await verifyPassword('wrong-password', 'hashed-password');

      expect(result).toBe(false);
    });
  });
});

