import { describe, it, expect, vi } from 'vitest';
import { encryptField, decryptField } from '../secrets';
import { encryptString, decryptString, parseEncrypted, serializeEncrypted } from '../crypto';

vi.mock('../crypto', () => ({
  encryptString: vi.fn(),
  decryptString: vi.fn(),
  parseEncrypted: vi.fn(),
  serializeEncrypted: vi.fn(),
}));

describe('secrets', () => {
  describe('encryptField', () => {
    it('returns null for null input', () => {
      expect(encryptField(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(encryptField(undefined)).toBeNull();
    });

    it('encrypts and serializes string value', () => {
      const mockEncrypted = { iv: 'iv', content: 'content', tag: 'tag' };
      const mockSerialized = 'serialized';
      vi.mocked(encryptString).mockReturnValueOnce(mockEncrypted);
      vi.mocked(serializeEncrypted).mockReturnValueOnce(mockSerialized);

      const result = encryptField('secret-value');

      expect(result).toBe(mockSerialized);
      expect(encryptString).toHaveBeenCalledWith('secret-value');
      expect(serializeEncrypted).toHaveBeenCalledWith(mockEncrypted);
    });
  });

  describe('decryptField', () => {
    it('returns null for null input', () => {
      expect(decryptField(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(decryptField(undefined)).toBeNull();
    });

    it('parses and decrypts serialized value', () => {
      const mockParsed = { iv: 'iv', content: 'content', tag: 'tag' };
      const mockDecrypted = 'decrypted-value';
      vi.mocked(parseEncrypted).mockReturnValueOnce(mockParsed);
      vi.mocked(decryptString).mockReturnValueOnce(mockDecrypted);

      const result = decryptField('serialized-value');

      expect(result).toBe(mockDecrypted);
      expect(parseEncrypted).toHaveBeenCalledWith('serialized-value');
      expect(decryptString).toHaveBeenCalledWith(mockParsed);
    });
  });
});

