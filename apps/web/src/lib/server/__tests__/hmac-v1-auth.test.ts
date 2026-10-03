import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNextRequest } from '@/test-utils/build-next-request';
import { createHmacV1Signature, InMemoryReplayStore } from '../hmac';
import { authenticateV1HmacRequest } from '../hmac-auth';

const mockFindActiveSecretsForRepo = vi.hoisted(() => vi.fn());
const mockUpdateSecretLastUsed = vi.hoisted(() => vi.fn());
const mockDecryptField = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());

vi.mock('../hmac-secrets', () => ({
  findActiveSecretsForRepo: mockFindActiveSecretsForRepo,
  updateSecretLastUsed: mockUpdateSecretLastUsed,
}));

vi.mock('../secrets', () => ({
  decryptField: mockDecryptField,
}));

vi.mock('../audit-service', () => ({
  extractRequestContext: vi.fn(() => ({ ipAddress: '127.0.0.1', userAgent: 'test' })),
  writeAuditLog: mockWriteAuditLog,
  AUDIT_ACTIONS: {
    hmacAuthFailure: 'hmacAuthFailure',
    hmacAuthSuccess: 'hmacAuthSuccess',
  },
  AUDIT_SUBJECTS: { security: 'security' },
}));

describe('authenticateV1HmacRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up the key id during rotation and verifies only that active key', async () => {
    const body = Buffer.from('{"event":"test"}');
    const now = 1_700_000_000;
    const signature = createHmacV1Signature('new-secret', 'secret-2', body, {
      timestamp: now,
      nonce: 'rotation-nonce',
    });
    mockFindActiveSecretsForRepo.mockResolvedValueOnce([
      { id: 'secret-2', secretValue: 'encrypted-new' },
      { id: 'secret-1', secretValue: 'encrypted-old' },
    ]);
    mockDecryptField.mockImplementation((value: string) =>
      value === 'encrypted-new' ? 'new-secret' : null
    );
    mockUpdateSecretLastUsed.mockResolvedValueOnce(undefined);

    const request = buildNextRequest('http://localhost/api/v1/ingestions', {
      method: 'POST',
      headers: {
        authorization: 'Bearer repo-1',
        'x-fr-sig': signature,
      },
    });
    const result = await authenticateV1HmacRequest(request, body, {
      now,
      replayStore: new InMemoryReplayStore(),
    });

    expect(result).toEqual({ success: true, repoId: 'repo-1', secretId: 'secret-2' });
    expect(mockDecryptField).toHaveBeenCalledTimes(1);
    expect(mockDecryptField).toHaveBeenCalledWith('encrypted-new');
    expect(mockUpdateSecretLastUsed).toHaveBeenCalledWith('secret-2');
  });
});
