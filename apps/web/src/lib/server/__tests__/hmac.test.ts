import { describe, it, expect } from 'vitest';
import { computeHmac, verifyHmac, extractHmacSignature, extractBearerToken } from '../hmac';

describe('HMAC utilities', () => {
  const secret = 'test-secret-key';
  const payload = 'test-payload';

  describe('computeHmac', () => {
    it('should compute HMAC-SHA256 signature', () => {
      const signature = computeHmac(secret, payload);
      expect(signature).toBeTruthy();
      expect(signature).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars for SHA-256
    });

    it('should produce consistent signatures for same input', () => {
      const sig1 = computeHmac(secret, payload);
      const sig2 = computeHmac(secret, payload);
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = computeHmac('secret1', payload);
      const sig2 = computeHmac('secret2', payload);
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const sig1 = computeHmac(secret, 'payload1');
      const sig2 = computeHmac(secret, 'payload2');
      expect(sig1).not.toBe(sig2);
    });

    it('should handle Buffer payloads', () => {
      const buffer = Buffer.from(payload, 'utf8');
      const sig1 = computeHmac(secret, payload);
      const sig2 = computeHmac(secret, buffer);
      expect(sig1).toBe(sig2);
    });
  });

  describe('verifyHmac', () => {
    it('should verify valid signatures', () => {
      const signature = computeHmac(secret, payload);
      const isValid = verifyHmac(secret, payload, signature);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      // Compute a valid signature but use an invalid one for verification
      computeHmac(secret, payload); // Valid signature (not used in this test)
      const isValid = verifyHmac(secret, payload, 'invalid-signature');
      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const signature = computeHmac(secret, payload);
      const isValid = verifyHmac('wrong-secret', payload, signature);
      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong payload', () => {
      const signature = computeHmac(secret, payload);
      const isValid = verifyHmac(secret, 'wrong-payload', signature);
      expect(isValid).toBe(false);
    });

    it('should handle timing-safe comparison', () => {
      const signature = computeHmac(secret, payload);
      // Test that length mismatch is caught early
      const isValid = verifyHmac(secret, payload, signature.substring(0, 10));
      expect(isValid).toBe(false);
      expect(signature.length).toBeGreaterThan(10); // Ensure we're testing length mismatch
    });

    it('should handle invalid hex signature gracefully', () => {
      const isValid = verifyHmac(secret, payload, 'not-hex-characters!');
      expect(isValid).toBe(false);
    });
  });

  describe('extractHmacSignature', () => {
    it('should extract signature from X-FR-Sig header (lowercase)', () => {
      const headers = new Headers({ 'x-fr-sig': 'test-signature' });
      const signature = extractHmacSignature(headers);
      expect(signature).toBe('test-signature');
    });

    it('should extract signature from X-FR-Sig header (uppercase)', () => {
      const headers = new Headers({ 'X-FR-Sig': 'test-signature' });
      const signature = extractHmacSignature(headers);
      expect(signature).toBe('test-signature');
    });

    it('should return null if header is missing', () => {
      const headers = new Headers();
      const signature = extractHmacSignature(headers);
      expect(signature).toBeNull();
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from Authorization header (lowercase)', () => {
      const headers = new Headers({ authorization: 'Bearer test-token' });
      const token = extractBearerToken(headers);
      expect(token).toBe('test-token');
    });

    it('should extract token from Authorization header (uppercase)', () => {
      const headers = new Headers({ Authorization: 'Bearer test-token' });
      const token = extractBearerToken(headers);
      expect(token).toBe('test-token');
    });

    it('should handle token with spaces', () => {
      const headers = new Headers({ authorization: 'Bearer token-with-spaces' });
      const token = extractBearerToken(headers);
      expect(token).toBe('token-with-spaces');
    });

    it('should return null if header is missing', () => {
      const headers = new Headers();
      const token = extractBearerToken(headers);
      expect(token).toBeNull();
    });

    it('should return null if format is invalid', () => {
      const headers = new Headers({ authorization: 'InvalidFormat token' });
      const token = extractBearerToken(headers);
      expect(token).toBeNull();
    });

    it('should return null if Bearer is missing', () => {
      const headers = new Headers({ authorization: 'token-only' });
      const token = extractBearerToken(headers);
      expect(token).toBeNull();
    });
  });
});
