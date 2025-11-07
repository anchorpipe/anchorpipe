# Data Encryption at Rest and In Transit (ST-202)

## Overview

Implements application-layer encryption for sensitive fields and ensures secure transport defaults.

## Transport (In Transit)

- Session cookies set with `httpOnly`, `sameSite=lax`, `secure` in production.
- Use TLS termination at the reverse proxy (e.g., Nginx/Ingress) with modern ciphers.
- Enable HSTS at the edge (see ST-204 for header config).

## At Rest (Application-layer)

- AES-256-GCM via Node crypto.
- Key provided via env `ENCRYPTION_KEY_BASE64` (base64 of 32 random bytes).
- Helpers in `apps/web/src/lib/crypto.ts` and `apps/web/src/lib/secrets.ts`.
- Store encrypted payload (iv, ciphertext, auth tag) as JSON string in DB.

## Environment Variables

- `ENCRYPTION_KEY_BASE64`: base64-encoded 32-byte key for AES-256-GCM.
  - Generate: `openssl rand -base64 32`

## Usage Example

```ts
import { encryptField, decryptField } from '@/lib/secrets';

// before save
const stored = encryptField(apiToken); // string | null

// after load
const token = decryptField(stored); // string | null
```

## Operational Notes

- Rotate keys using a KMS in production (future enhancement):
  - Introduce key IDs and multi-decrypt during rotation.
  - Re-encrypt values with new active key.
- Backups: ensure encrypted values are backed up; keys must be stored separately (KMS/Secrets Manager).

## Testing

- Unit tests: `apps/web/src/lib/crypto.test.ts`.
- Type-check/build: covered by CI.
