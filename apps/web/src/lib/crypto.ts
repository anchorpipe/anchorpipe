import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // GCM recommended 96-bit IV

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY_BASE64;
  if (!key) {
    throw new Error('ENCRYPTION_KEY_BASE64 must be set (base64-encoded 32 bytes)');
  }
  const buf = Buffer.from(key, 'base64');
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY_BASE64 must decode to 32 bytes for aes-256-gcm');
  }
  return buf;
}

export type EncryptedPayload = {
  iv: string; // base64
  ciphertext: string; // base64
  tag: string; // base64
};

export function encryptString(plaintext: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: authTag.toString('base64'),
  };
}

export function decryptString(payload: EncryptedPayload): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export function serializeEncrypted(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

export function parseEncrypted(serialized: string): EncryptedPayload {
  return JSON.parse(serialized) as EncryptedPayload;
}
