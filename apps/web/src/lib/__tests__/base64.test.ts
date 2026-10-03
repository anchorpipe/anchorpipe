import { describe, it, expect } from 'vitest';
import { base64URLEncode, base64URLDecode } from '../base64';

describe('Base64URL encoding/decoding', () => {
  describe('base64URLEncode', () => {
    it('should encode buffer to base64url', () => {
      const buffer = Buffer.from('hello world');
      const encoded = base64URLEncode(buffer);
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should replace + with -', () => {
      const buffer = Buffer.from([0xfb, 0xef, 0xbe]); // Will produce + in base64
      const encoded = base64URLEncode(buffer);
      expect(encoded).not.toContain('+');
      expect(encoded).toContain('-');
    });

    it('should replace / with _', () => {
      const buffer = Buffer.from([0xff, 0xef, 0xbe]); // Will produce / in base64
      const encoded = base64URLEncode(buffer);
      expect(encoded).not.toContain('/');
      expect(encoded).toContain('_');
    });

    it('should remove padding =', () => {
      const buffer = Buffer.from('test');
      const encoded = base64URLEncode(buffer);
      expect(encoded).not.toContain('=');
    });
  });

  describe('base64URLDecode', () => {
    it('should decode base64url back to original buffer', () => {
      const original = Buffer.from('hello world');
      const encoded = base64URLEncode(original);
      const decoded = base64URLDecode(encoded);
      expect(decoded).toEqual(original);
    });

    it('should handle - and _ characters', () => {
      const original = Buffer.from([0xfb, 0xef, 0xbe, 0xff]);
      const encoded = base64URLEncode(original);
      const decoded = base64URLDecode(encoded);
      expect(decoded).toEqual(original);
    });

    it('should add padding when needed', () => {
      const original = Buffer.from('test');
      const encoded = base64URLEncode(original);
      const decoded = base64URLDecode(encoded);
      expect(decoded).toEqual(original);
    });
  });

  describe('round-trip encoding/decoding', () => {
    it('should preserve data through encode/decode cycle', () => {
      const testCases = [
        'hello world',
        'test@example.com',
        '1234567890',
        '!@#$%^&*()',
        Buffer.from([0x00, 0xff, 0x42, 0x13]),
      ];

      for (const testCase of testCases) {
        const buffer = Buffer.isBuffer(testCase) ? testCase : Buffer.from(testCase);
        const encoded = base64URLEncode(buffer);
        const decoded = base64URLDecode(encoded);
        expect(decoded).toEqual(buffer);
      }
    });
  });
});
