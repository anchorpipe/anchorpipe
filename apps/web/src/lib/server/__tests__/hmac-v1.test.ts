import { describe, expect, it } from 'vitest';
import {
  InMemoryReplayStore,
  createHmacV1Signature,
  parseHmacV1Signature,
  verifyHmacV1Signature,
} from '../hmac';

describe('HMAC v1 signatures', () => {
  const secret = 'v1-test-secret';
  const body = Buffer.from('{"event":"test"}');
  const now = 1_700_000_000;

  it('accepts a valid signature and binds the body digest', () => {
    const wireSignature = createHmacV1Signature(secret, 'key-current', body, {
      timestamp: now,
      nonce: 'nonce-valid',
    });
    const parsed = parseHmacV1Signature(wireSignature);

    expect(parsed).not.toBeNull();
    expect(parsed?.keyId).toBe('key-current');
    expect(verifyHmacV1Signature(secret, body, parsed!, { now })).toBe(true);
  });

  it('rejects signatures outside the configured clock skew', () => {
    const parsed = parseHmacV1Signature(
      createHmacV1Signature(secret, 'key-current', body, {
        timestamp: now - 301,
        nonce: 'nonce-stale',
      })
    );

    expect(parsed).not.toBeNull();
    expect(verifyHmacV1Signature(secret, body, parsed!, { now, clockSkewSeconds: 300 })).toBe(
      false
    );
  });

  it('rejects an altered body even when the original signature is reused', () => {
    const parsed = parseHmacV1Signature(
      createHmacV1Signature(secret, 'key-current', body, {
        timestamp: now,
        nonce: 'nonce-body',
      })
    );

    expect(parsed).not.toBeNull();
    expect(
      verifyHmacV1Signature(secret, Buffer.from('{"event":"altered"}'), parsed!, { now })
    ).toBe(false);
  });

  it('rejects malformed versioned signatures', () => {
    expect(
      parseHmacV1Signature('v1;kid=key-current;ts=not-a-number;nonce=n;digest=bad;sig=bad')
    ).toBeNull();
    expect(
      parseHmacV1Signature('v0;kid=key-current;ts=1700000000;nonce=n;digest=00;sig=00')
    ).toBeNull();
    expect(
      parseHmacV1Signature('v1;kid=key-current;ts=1700000000;nonce=n;digest=00;sig=00;extra=x')
    ).toBeNull();
  });

  it('rejects a duplicate nonce atomically', () => {
    const replayStore = new InMemoryReplayStore();
    expect(replayStore.consume('nonce-replayed', Date.now() + 60_000)).toBe(true);
    expect(replayStore.consume('nonce-replayed', Date.now() + 60_000)).toBe(false);
  });
});
