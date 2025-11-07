import { describe, it, expect, beforeAll } from 'vitest';
import { decryptString, encryptString, parseEncrypted, serializeEncrypted } from './crypto';

describe('crypto', () => {
  beforeAll(() => {
    if (!process.env.ENCRYPTION_KEY_BASE64) {
      // 32 random bytes base64 for tests
      process.env.ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');
    }
  });

  it('round-trips plaintext', () => {
    const enc = encryptString('hello-world');
    const dec = decryptString(enc);
    expect(dec).toBe('hello-world');
  });

  it('serializes and parses payloads', () => {
    const enc = encryptString('abc');
    const ser = serializeEncrypted(enc);
    const parsed = parseEncrypted(ser);
    expect(decryptString(parsed)).toBe('abc');
  });
});
