import { decryptString, encryptString, parseEncrypted, serializeEncrypted } from './crypto';

// Helper to encrypt string fields before persisting (e.g., tokens)
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  const payload = encryptString(value);
  return serializeEncrypted(payload);
}

// Helper to decrypt string fields after loading from DB
export function decryptField(serialized: string | null | undefined): string | null {
  if (!serialized) return null;
  const payload = parseEncrypted(serialized);
  return decryptString(payload);
}

