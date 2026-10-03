import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyGitHubWebhookSignature } from '../github-webhook';
import { createHmac } from 'crypto';

vi.mock('crypto', () => ({
  createHmac: vi.fn(),
}));

describe('github-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GITHUB_APP_WEBHOOK_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('verifyGitHubWebhookSignature', () => {
    it('verifies valid signature', async () => {
      const body = 'test body';
      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('computed-signature'),
      };
      vi.mocked(createHmac).mockReturnValue(mockHmac as any);

      // Create a valid signature format
      const signature = 'sha256=computed-signature';

      const result = await verifyGitHubWebhookSignature(body, signature);

      expect(result).toBe(true);
      expect(createHmac).toHaveBeenCalledWith('sha256', 'test-secret');
      expect(mockHmac.update).toHaveBeenCalledWith(body);
      expect(mockHmac.digest).toHaveBeenCalledWith('hex');
    });

    it('rejects invalid signature', async () => {
      const body = 'test body';
      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('computed-signature'),
      };
      vi.mocked(createHmac).mockReturnValue(mockHmac as any);

      const signature = 'sha256=different-signature';

      const result = await verifyGitHubWebhookSignature(body, signature);

      expect(result).toBe(false);
    });

    it('handles signature without sha256= prefix', async () => {
      const body = 'test body';
      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('computed-signature'),
      };
      vi.mocked(createHmac).mockReturnValue(mockHmac as any);

      const signature = 'computed-signature';

      const result = await verifyGitHubWebhookSignature(body, signature);

      expect(result).toBe(true);
    });

    it('returns false when secret is missing', async () => {
      vi.unstubAllEnvs();
      delete process.env.GITHUB_APP_WEBHOOK_SECRET;

      const result = await verifyGitHubWebhookSignature('body', 'sha256=signature');

      expect(result).toBe(false);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(createHmac).mockImplementationOnce(() => {
        throw new Error('crypto error');
      });

      const result = await verifyGitHubWebhookSignature('body', 'sha256=signature');

      expect(result).toBe(false);
    });
  });
});

