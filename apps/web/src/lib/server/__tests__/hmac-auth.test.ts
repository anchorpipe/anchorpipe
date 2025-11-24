import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateHmacRequest } from '../hmac-auth';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockExtractBearerToken = vi.hoisted(() => vi.fn());
const mockExtractHmacSignature = vi.hoisted(() => vi.fn());
const mockVerifyHmac = vi.hoisted(() => vi.fn());
const mockFindActiveSecretsForRepo = vi.hoisted(() => vi.fn());
const mockUpdateSecretLastUsed = vi.hoisted(() => vi.fn());
const mockDecryptField = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '127.0.0.1', userAgent: 'test' }))
);
const mockWriteAuditLog = vi.hoisted(() => vi.fn());

vi.mock('../hmac', () => ({
  extractBearerToken: mockExtractBearerToken,
  extractHmacSignature: mockExtractHmacSignature,
  verifyHmac: mockVerifyHmac,
}));

vi.mock('../hmac-secrets', () => ({
  findActiveSecretsForRepo: mockFindActiveSecretsForRepo,
  updateSecretLastUsed: mockUpdateSecretLastUsed,
}));

vi.mock('../secrets', () => ({
  decryptField: mockDecryptField,
}));

vi.mock('../audit-service', () => ({
  extractRequestContext: mockExtractRequestContext,
  writeAuditLog: mockWriteAuditLog,
  AUDIT_ACTIONS: {
    hmacAuthFailure: 'hmacAuthFailure',
    hmacAuthSuccess: 'hmacAuthSuccess',
  },
  AUDIT_SUBJECTS: {
    security: 'security',
  },
}));

describe('hmac-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateHmacRequest', () => {
    it('returns error when Bearer token is missing', async () => {
      mockExtractBearerToken.mockReturnValueOnce(null);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing Authorization header with Bearer token');
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hmacAuthFailure',
          description: 'HMAC authentication failed: missing Bearer token',
        })
      );
    });

    it('returns error when X-FR-Sig header is missing', async () => {
      mockExtractBearerToken.mockReturnValueOnce('repo-1');
      mockExtractHmacSignature.mockReturnValueOnce(null);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing X-FR-Sig header');
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hmacAuthFailure',
          description: 'HMAC authentication failed: missing X-FR-Sig header',
        })
      );
    });

    it('returns error when no active secrets found', async () => {
      mockExtractBearerToken.mockReturnValueOnce('repo-1');
      mockExtractHmacSignature.mockReturnValueOnce('signature');
      mockFindActiveSecretsForRepo.mockResolvedValueOnce([]);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active HMAC secrets found for repository');
    });

    it('returns success when signature is valid', async () => {
      mockExtractBearerToken.mockReturnValueOnce('repo-1');
      mockExtractHmacSignature.mockReturnValueOnce('valid-signature');
      mockFindActiveSecretsForRepo.mockResolvedValueOnce([
        { id: 'secret-1', secretValue: 'encrypted-secret' },
      ]);
      mockDecryptField.mockReturnValueOnce('decrypted-secret');
      mockVerifyHmac.mockReturnValueOnce(true);
      mockUpdateSecretLastUsed.mockResolvedValueOnce(undefined);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(true);
      expect(result.repoId).toBe('repo-1');
      expect(result.secretId).toBe('secret-1');
      expect(mockVerifyHmac).toHaveBeenCalledWith('decrypted-secret', 'body', 'valid-signature');
      expect(mockUpdateSecretLastUsed).toHaveBeenCalledWith('secret-1');
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hmacAuthSuccess',
        })
      );
    });

    it('tries multiple secrets until one matches', async () => {
      mockExtractBearerToken.mockReturnValueOnce('repo-1');
      mockExtractHmacSignature.mockReturnValueOnce('valid-signature');
      mockFindActiveSecretsForRepo.mockResolvedValueOnce([
        { id: 'secret-1', secretValue: 'encrypted-1' },
        { id: 'secret-2', secretValue: 'encrypted-2' },
      ]);
      mockDecryptField
        .mockReturnValueOnce('decrypted-1')
        .mockReturnValueOnce('decrypted-2');
      mockVerifyHmac
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      mockUpdateSecretLastUsed.mockResolvedValueOnce(undefined);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(true);
      expect(result.secretId).toBe('secret-2');
      expect(mockVerifyHmac).toHaveBeenCalledTimes(2);
    });

    it('returns error when all signatures are invalid', async () => {
      mockExtractBearerToken.mockReturnValueOnce('repo-1');
      mockExtractHmacSignature.mockReturnValueOnce('invalid-signature');
      mockFindActiveSecretsForRepo.mockResolvedValueOnce([
        { id: 'secret-1', secretValue: 'encrypted-1' },
      ]);
      mockDecryptField.mockReturnValueOnce('decrypted-1');
      mockVerifyHmac.mockReturnValueOnce(false);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid HMAC signature');
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hmacAuthFailure',
          description: 'HMAC authentication failed: invalid signature',
        })
      );
    });

    it('skips secrets that fail to decrypt', async () => {
      mockExtractBearerToken.mockReturnValueOnce('repo-1');
      mockExtractHmacSignature.mockReturnValueOnce('signature');
      mockFindActiveSecretsForRepo.mockResolvedValueOnce([
        { id: 'secret-1', secretValue: 'encrypted-1' },
        { id: 'secret-2', secretValue: 'encrypted-2' },
      ]);
      mockDecryptField
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('decrypted-2');
      mockVerifyHmac.mockReturnValueOnce(true);
      mockUpdateSecretLastUsed.mockResolvedValueOnce(undefined);

      const request = buildNextRequest('http://localhost/api/ingestion');
      const result = await authenticateHmacRequest(request, 'body');

      expect(result.success).toBe(true);
      expect(result.secretId).toBe('secret-2');
      expect(mockVerifyHmac).toHaveBeenCalledTimes(1);
    });
  });
});

