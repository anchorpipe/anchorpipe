import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  triggerIngestionForWorkflowRun,
  triggerIngestionForCheckRun,
} from '../github-app-ingestion-trigger';
import type { RepositoryInfo, CommitInfo } from '../github-app-ingestion-trigger';

const mockPrisma = vi.hoisted(() => ({
  repo: {
    findUnique: vi.fn(),
  },
}));

const mockGetInstallationToken = vi.hoisted(() => vi.fn());
const mockFindActiveSecretsForRepo = vi.hoisted(() => vi.fn());
const mockComputeHmac = vi.hoisted(() => vi.fn());
const mockDecryptField = vi.hoisted(() => vi.fn());
const mockParseTestReport = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('../github-app-tokens', () => ({
  getInstallationToken: mockGetInstallationToken,
}));

vi.mock('../hmac-secrets', () => ({
  findActiveSecretsForRepo: mockFindActiveSecretsForRepo,
}));

vi.mock('../hmac', () => ({
  computeHmac: mockComputeHmac,
}));

vi.mock('../secrets', () => ({
  decryptField: mockDecryptField,
}));

vi.mock('../test-report-parsers', () => ({
  parseTestReport: mockParseTestReport,
}));

vi.mock('../audit-service', () => ({
  writeAuditLog: mockWriteAuditLog,
  AUDIT_ACTIONS: {
    ingestionTriggered: 'ingestionTriggered',
  },
  AUDIT_SUBJECTS: {
    ingestion: 'ingestion',
  },
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

describe('github-app-ingestion-trigger', () => {
  const repository: RepositoryInfo = {
    id: 123,
    fullName: 'acme/repo',
  };

  const commit: CommitInfo = {
    sha: 'a'.repeat(40),
    branch: 'main',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockGetInstallationToken.mockResolvedValue('github-token');
    mockPrisma.repo.findUnique.mockResolvedValue({
      id: 'repo-1',
      ghId: 123n,
    });
    mockFindActiveSecretsForRepo.mockResolvedValue([
      { id: 'secret-1', secretValue: 'encrypted-secret' },
    ]);
    mockDecryptField.mockReturnValue('decrypted-secret');
    mockComputeHmac.mockReturnValue('hmac-signature');
  });

  describe('triggerIngestionForWorkflowRun', () => {
    it('returns error when repository not found', async () => {
      mockPrisma.repo.findUnique.mockResolvedValueOnce(null);

      const result = await triggerIngestionForWorkflowRun({
        workflowRunId: 555,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository not found in database');
    });

    it('returns success when no test results found', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ artifacts: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ artifacts: [] }),
        } as Response);

      const result = await triggerIngestionForWorkflowRun({
        workflowRunId: 555,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(true);
    });

    it('processes artifacts and submits test results', async () => {
      const testReport = JSON.stringify({
        tests: [
          {
            path: 'test.ts',
            name: 'test',
            status: 'pass',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            artifacts: [{ id: 1, name: 'test-results.json', size_in_bytes: 100 }],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => Buffer.from(testReport),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ runId: 'ingestion-run-1' }),
        } as Response);

      mockParseTestReport.mockResolvedValueOnce({
        framework: 'jest',
        tests: [
          {
            path: 'test.ts',
            name: 'test',
            status: 'pass',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      const result = await triggerIngestionForWorkflowRun({
        workflowRunId: 555,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(true);
      expect(mockParseTestReport).toHaveBeenCalled();
      expect(mockWriteAuditLog).toHaveBeenCalled();
    });

    it('handles errors during processing', async () => {
      mockGetInstallationToken.mockRejectedValueOnce(new Error('Token error'));

      const result = await triggerIngestionForWorkflowRun({
        workflowRunId: 555,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('triggerIngestionForCheckRun', () => {
    it('returns error when repository not found', async () => {
      mockPrisma.repo.findUnique.mockResolvedValueOnce(null);

      const result = await triggerIngestionForCheckRun({
        checkRunId: 44,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository not found in database');
    });

    it('returns success for check run (placeholder implementation)', async () => {
      const result = await triggerIngestionForCheckRun({
        checkRunId: 44,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Check run ingestion not fully implemented yet',
        expect.objectContaining({ checkRunId: 44 })
      );
    });

    it('handles errors during processing', async () => {
      mockPrisma.repo.findUnique.mockRejectedValueOnce(new Error('DB error'));

      const result = await triggerIngestionForCheckRun({
        checkRunId: 44,
        repository,
        commit,
        installationId: 77,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });
});

