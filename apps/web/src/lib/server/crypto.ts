import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // GCM recommended 96-bit IV

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY_BASE64;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY_BASE64 must be set');
  }
  return Buffer.from(secret, 'base64');
}

export type EncryptedPayload = {
  iv: string;
  content: string;
  tag: string;
};

/**
 * Encrypt a string using AES-256-GCM
 */
export function encryptString(text: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    content: encrypted,
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt an encrypted payload using AES-256-GCM
 */
export function decryptString(enc: EncryptedPayload): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(enc.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(enc.tag, 'hex'));
  let decrypted = decipher.update(enc.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Serialize encrypted payload to JSON string for storage
 */
export function serializeEncrypted(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parse encrypted payload from JSON string
 */
export function parseEncrypted(serialized: string): EncryptedPayload {
  return JSON.parse(serialized) as EncryptedPayload;
}
