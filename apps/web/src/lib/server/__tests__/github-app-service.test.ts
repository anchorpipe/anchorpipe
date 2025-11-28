/**
 * GitHub App Service Tests
 *
 * Story: ST-301
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  upsertGitHubAppInstallation,
  deleteGitHubAppInstallation,
  getGitHubAppInstallationById,
  listGitHubAppInstallations,
  getGitHubAppInstallationsByAccount,
  updateInstallationRepositorySelection,
  syncRepositoriesFromInstallation,
  validateInstallationPermissions,
  refreshInstallationPermissions,
  checkInstallationHealth,
  type GitHubAppInstallationData,
} from '../github-app-service';
import { prisma } from '@anchorpipe/database';

// Mock Prisma client
vi.mock('@anchorpipe/database', () => ({
  prisma: {
    gitHubAppInstallation: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    repo: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Type assertion for mocked prisma to avoid TypeScript errors
const mockedPrisma = prisma as any;

// Mock audit service
const mockWriteAuditLog = vi.hoisted(() => vi.fn());

vi.mock('../audit-service', () => ({
  writeAuditLog: mockWriteAuditLog,
  AUDIT_ACTIONS: {
    configUpdated: 'configUpdated',
    other: 'other',
  },
  AUDIT_SUBJECTS: {
    system: 'system',
    repo: 'repo',
  },
}));

// Mock logger
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

const mockGetInstallationToken = vi.hoisted(() => vi.fn());

vi.mock('../github-app-tokens', () => ({
  getInstallationToken: mockGetInstallationToken,
}));

// Helper function to create mock installation data
function createMockInstallationData(
  overrides?: Partial<GitHubAppInstallationData>
): GitHubAppInstallationData {
  return {
    id: 123456,
    account: {
      id: 789,
      login: 'testuser',
      type: 'User',
    },
    target_type: 'User',
    repository_selection: 'selected',
    repositories: [
      { id: 1, name: 'repo1', full_name: 'testuser/repo1' },
      { id: 2, name: 'repo2', full_name: 'testuser/repo2' },
    ],
    permissions: {
      metadata: 'read',
      contents: 'read',
    },
    events: ['push', 'pull_request'],
    ...overrides,
  };
}

// Helper function to create mock installation database record
function createMockInstallation(overrides?: {
  id?: string;
  installationId?: bigint;
  repositoryIds?: bigint[];
  permissions?: Record<string, string>;
  events?: string[];
}) {
  return {
    id: overrides?.id ?? 'uuid-1',
    installationId: overrides?.installationId ?? BigInt(123456),
    accountId: BigInt(789),
    accountType: 'User',
    accountLogin: 'testuser',
    targetType: 'User',
    targetId: null,
    repositoryIds: overrides?.repositoryIds ?? [BigInt(1), BigInt(2)],
    permissions: overrides?.permissions ?? { metadata: 'read' },
    events: overrides?.events ?? ['push'],
    suspendedAt: null,
    suspendedBy: null,
    suspendedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function for expected installation result
function expectInstallationResult(result: { id: string; installationId: bigint }) {
  expect(result).toEqual({
    id: 'uuid-1',
    installationId: BigInt(123456),
  });
}

describe('GitHub App Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
  });

  // Helper to setup mocks for upsert tests
  function setupUpsertMocks(findUniqueResult: any, createResult?: any, updateResult?: any) {
    vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(findUniqueResult);
    if (createResult) {
      vi.mocked(mockedPrisma.gitHubAppInstallation.create).mockResolvedValue(createResult);
    }
    if (updateResult) {
      vi.mocked(mockedPrisma.gitHubAppInstallation.update).mockResolvedValue(updateResult);
    }
  }

  describe('upsertGitHubAppInstallation', () => {
    it('should create a new installation when it does not exist', async () => {
      const mockCreated = createMockInstallation({
        permissions: { metadata: 'read', contents: 'read' },
        events: ['push', 'pull_request'],
      });

      setupUpsertMocks(null, mockCreated);

      const result = await upsertGitHubAppInstallation(createMockInstallationData());

      expectInstallationResult(result);
      expect(mockedPrisma.gitHubAppInstallation.create).toHaveBeenCalledOnce();
      expect(mockedPrisma.gitHubAppInstallation.update).not.toHaveBeenCalled();
    });

    it('should update an existing installation', async () => {
      const mockExisting = createMockInstallation({
        repositoryIds: [BigInt(1)],
      });

      const mockUpdated = createMockInstallation({
        repositoryIds: [BigInt(1), BigInt(2)],
        permissions: { metadata: 'read', contents: 'read' },
        events: ['push', 'pull_request'],
      });

      setupUpsertMocks(mockExisting, undefined, mockUpdated);

      const result = await upsertGitHubAppInstallation(createMockInstallationData());

      expectInstallationResult(result);
      expect(mockedPrisma.gitHubAppInstallation.update).toHaveBeenCalledOnce();
      expect(mockedPrisma.gitHubAppInstallation.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteGitHubAppInstallation', () => {
    it('should delete an existing installation', async () => {
      const mockExisting = createMockInstallation();

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(mockExisting);
      vi.mocked(mockedPrisma.gitHubAppInstallation.delete).mockResolvedValue(mockExisting);

      await deleteGitHubAppInstallation(BigInt(123456));

      expect(mockedPrisma.gitHubAppInstallation.delete).toHaveBeenCalledOnce();
    });

    it('should not throw if installation does not exist', async () => {
      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(null);

      await expect(deleteGitHubAppInstallation(BigInt(123456))).resolves.not.toThrow();
      expect(mockedPrisma.gitHubAppInstallation.delete).not.toHaveBeenCalled();
    });
  });

  describe('getGitHubAppInstallationById', () => {
    it('should return installation when found', async () => {
      const mockInstallation = createMockInstallation();

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(mockInstallation);

      const result = await getGitHubAppInstallationById(BigInt(123456));

      expect(result).toBeTruthy();
      expect(result?.installationId).toEqual(BigInt(123456));
    });

    it('should return null when installation not found', async () => {
      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(null);

      const result = await getGitHubAppInstallationById(BigInt(123456));

      expect(result).toBeNull();
    });
  });

  describe('listGitHubAppInstallations', () => {
    it('should return list of installations', async () => {
      const mockInstallations = [
        {
          id: 'uuid-1',
          installationId: BigInt(123456),
          accountLogin: 'testuser',
          accountType: 'User',
          repositoryIds: [BigInt(1), BigInt(2)],
          suspendedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'uuid-2',
          installationId: BigInt(789012),
          accountLogin: 'testorg',
          accountType: 'Organization',
          repositoryIds: [BigInt(3)],
          suspendedAt: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockedPrisma.gitHubAppInstallation.findMany).mockResolvedValue(mockInstallations);

      const result = await listGitHubAppInstallations();

      expect(result).toHaveLength(2);
      expect(result[0].accountLogin).toBe('testuser');
      expect(result[0].repositoryCount).toBe(2);
      expect(result[1].accountLogin).toBe('testorg');
      expect(result[1].repositoryCount).toBe(1);
    });
  });

  describe('getGitHubAppInstallationsByAccount', () => {
    it('should return installations for a specific account', async () => {
      const mockInstallations = [
        {
          id: 'uuid-1',
          installationId: BigInt(123456),
          accountLogin: 'testuser',
          repositoryIds: [BigInt(1), BigInt(2)],
          suspendedAt: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(mockedPrisma.gitHubAppInstallation.findMany).mockResolvedValue(mockInstallations);

      const result = await getGitHubAppInstallationsByAccount('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].accountLogin).toBe('testuser');
    });
  });

  describe('updateInstallationRepositorySelection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Mock fetch globally
      global.fetch = vi.fn();
    });

    it('should update repository selection successfully', async () => {
      const installationId = BigInt(123456);
      const repositoryIds = [1, 2, 3];

      const mockInstallation = createMockInstallation({
        installationId,
        repositoryIds: [BigInt(1)],
      });

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(mockInstallation);
      vi.mocked(mockedPrisma.gitHubAppInstallation.update).mockResolvedValue({
        ...mockInstallation,
        repositoryIds: repositoryIds.map(BigInt),
      });

      // Mock token generation
      vi.mock('../github-app-tokens', () => ({
        getInstallationToken: vi.fn().mockResolvedValue('mock-token'),
      }));

      // Mock GitHub API responses
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            repositories: [
              {
                id: 1,
                name: 'repo1',
                full_name: 'owner/repo1',
                owner: { login: 'owner' },
                private: false,
              },
              {
                id: 2,
                name: 'repo2',
                full_name: 'owner/repo2',
                owner: { login: 'owner' },
                private: false,
              },
              {
                id: 3,
                name: 'repo3',
                full_name: 'owner/repo3',
                owner: { login: 'owner' },
                private: false,
              },
            ],
          }),
        });

      const result = await updateInstallationRepositorySelection(installationId, repositoryIds);

      expect(result.success).toBe(true);
      expect(result.updatedRepositories).toBe(3);
      expect(mockedPrisma.gitHubAppInstallation.update).toHaveBeenCalled();
    });

    it('should return error if installation not found', async () => {
      const installationId = BigInt(999999);
      const repositoryIds = [1, 2];

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(null);

      const result = await updateInstallationRepositorySelection(installationId, repositoryIds);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Installation not found');
    });

    it('should handle GitHub API errors', async () => {
      const installationId = BigInt(123456);
      const repositoryIds = [1, 2];

      const mockInstallation = createMockInstallation({
        installationId,
      });

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(mockInstallation);

      // Mock token generation
      vi.mock('../github-app-tokens', () => ({
        getInstallationToken: vi.fn().mockResolvedValue('mock-token'),
      }));

      // Mock GitHub API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const result = await updateInstallationRepositorySelection(installationId, repositoryIds);

      expect(result.success).toBe(false);
      expect(result.error).toContain('GitHub API returned 403');
    });
  });

  describe('syncRepositoriesFromInstallation', () => {
    it('creates and updates repositories then logs audit entry', async () => {
      const repositories = [
        {
          id: 1,
          name: 'repo-one',
          full_name: 'owner/repo-one',
          owner: { login: 'owner' },
          private: false,
        },
        {
          id: 2,
          name: 'repo-two',
          full_name: 'owner/repo-two',
          owner: { login: 'owner' },
          private: true,
        },
      ];

      vi.mocked(mockedPrisma.repo.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' });
      vi.mocked(mockedPrisma.repo.create).mockResolvedValueOnce({ id: 'created' });
      vi.mocked(mockedPrisma.repo.update).mockResolvedValueOnce({ id: 'updated' });

      const result = await syncRepositoriesFromInstallation(repositories);

      expect(result).toEqual({ created: 1, updated: 1 });
      expect(mockedPrisma.repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'repo-one', owner: 'owner' }),
        })
      );
      expect(mockedPrisma.repo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'repo-two' }),
        })
      );
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'configUpdated',
          metadata: expect.objectContaining({
            repositoriesCreated: 1,
            repositoriesUpdated: 1,
            totalRepositories: repositories.length,
          }),
        })
      );
    });
  });

  describe('validateInstallationPermissions', () => {
    it('returns installation_not_found when record missing', async () => {
      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(null);

      const result = await validateInstallationPermissions(BigInt(42));

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('installation_not_found');
    });

    it('captures missing permissions and warnings', async () => {
      const installation = createMockInstallation({
        permissions: { metadata: 'read', contents: 'admin', pull_requests: 'read' },
      });

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(installation);

      const result = await validateInstallationPermissions(BigInt(installation.installationId));

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(expect.arrayContaining(['pull_requests:write', 'checks:write']));
      expect(result.warnings).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('insufficient permissions'),
        expect.objectContaining({
          installationId: installation.installationId.toString(),
        })
      );
    });
  });

  describe('refreshInstallationPermissions', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
      mockGetInstallationToken.mockResolvedValue('token');
    });

    it('updates permissions from GitHub API and validates them', async () => {
      const installation = createMockInstallation({
        permissions: { metadata: 'read' },
      });
      const refreshed = {
        ...installation,
        permissions: { metadata: 'read', contents: 'read', pull_requests: 'write', checks: 'write' },
      };

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique)
        .mockResolvedValueOnce(installation)
        .mockResolvedValueOnce(refreshed);
      vi.mocked(mockedPrisma.gitHubAppInstallation.update).mockResolvedValue(refreshed);

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          permissions: refreshed.permissions,
        }),
      });

      const result = await refreshInstallationPermissions(installation.installationId);

      expect(result.success).toBe(true);
      expect(mockedPrisma.gitHubAppInstallation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: refreshed.permissions }),
        })
      );
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Refreshed permissions'),
        })
      );
    });

    it('returns error when GitHub API fails', async () => {
      const installation = createMockInstallation();

      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique)
        .mockResolvedValueOnce(installation)
        .mockResolvedValueOnce(installation);

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      });

      const result = await refreshInstallationPermissions(installation.installationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch installation from GitHub API'),
        expect.any(Object)
      );
    });
  });

  describe('checkInstallationHealth', () => {
    it('returns not found health check when installation missing', async () => {
      vi.mocked(mockedPrisma.gitHubAppInstallation.findUnique).mockResolvedValue(null);
      const service = await import('../github-app-service');
      vi.spyOn(service, 'getGitHubAppInstallationById').mockResolvedValue(null as any);

      const result = await service.checkInstallationHealth(BigInt(99));

      expect(result.healthy).toBe(false);
      expect(result.summary).toContain('not found');
      expect(result.checks.exists.status).toBe('fail');
    });
  });
});
