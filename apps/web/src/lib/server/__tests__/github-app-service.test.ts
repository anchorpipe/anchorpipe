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
vi.mock('../audit-service', () => ({
  writeAuditLog: vi.fn(),
  AUDIT_ACTIONS: {
    config_updated: 'config_updated',
  },
  AUDIT_SUBJECTS: {
    system: 'system',
  },
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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
    vi.clearAllMocks();
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
});
