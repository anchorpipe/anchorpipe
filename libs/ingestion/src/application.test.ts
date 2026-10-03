import { describe, expect, it, vi } from 'vitest';
import { acceptIngestion, sha256Hex } from './application';

const context = { tenantId: 'tenant-1', repoId: 'repo-1', credentialId: 'key-1' };
const body = JSON.stringify({
  event_id: 'evt-1',
  schema_version: 'test-report.v1',
  source: 'local',
  occurred_at: '2026-01-01T00:00:00.000Z',
  run: { attempt: 1, commit_sha: 'a'.repeat(40), framework: 'junit' },
  content: { media_type: 'application/json' },
});

function ports() {
  return {
    objects: { put: vi.fn().mockResolvedValue(undefined) },
    receipts: {
      accept: vi.fn().mockResolvedValue({
        ingestionId: 'receipt-1',
        state: 'accepted',
        statusUrl: '/v1/ingestions/receipt-1',
        duplicate: false,
      }),
    },
  };
}

describe('acceptIngestion', () => {
  it('hashes exact bytes and writes the object before accepting the receipt', async () => {
    const p = ports();
    const raw = new TextEncoder().encode(body);
    const result = await acceptIngestion(
      { context, clientKey: 'client-key-1', rawBody: raw, contentType: 'application/json' },
      p
    );

    expect(result.state).toBe('accepted');
    expect(p.objects.put).toHaveBeenCalledWith(
      expect.objectContaining({ sha256: sha256Hex(raw), bytes: raw })
    );
    expect(p.receipts.accept).toHaveBeenCalledWith(
      expect.objectContaining({ clientKey: 'client-key-1', requestHash: sha256Hex(raw) })
    );
    expect(p.objects.put.mock.invocationCallOrder[0]).toBeLessThan(
      p.receipts.accept.mock.invocationCallOrder[0]
    );
  });

  it('rejects non-JSON input before touching storage', async () => {
    const p = ports();
    await expect(
      acceptIngestion(
        {
          context,
          clientKey: 'key',
          rawBody: new TextEncoder().encode('{}'),
          contentType: 'text/plain',
        },
        p
      )
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE', httpStatus: 415 });
    expect(p.objects.put).not.toHaveBeenCalled();
  });

  it('rejects malformed envelopes with a stable code', async () => {
    const p = ports();
    await expect(
      acceptIngestion(
        {
          context,
          clientKey: 'key',
          rawBody: new TextEncoder().encode('{}'),
          contentType: 'application/json',
        },
        p
      )
    ).rejects.toMatchObject({ code: 'INVALID_ENVELOPE', httpStatus: 400 });
    expect(p.receipts.accept).not.toHaveBeenCalled();
  });
});
