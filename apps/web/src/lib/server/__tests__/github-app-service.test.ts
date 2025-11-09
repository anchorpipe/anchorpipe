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
    githubAppInstallation: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

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

describe('GitHub App Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInstallationData: GitHubAppInstallationData = {
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
  };

  describe('upsertGitHubAppInstallation', () => {
    it('should create a new installation when it does not exist', async () => {
      const mockCreated = {
        id: 'uuid-1',
        installationId: BigInt(123456),
        accountId: BigInt(789),
        accountType: 'User',
        accountLogin: 'testuser',
        targetType: 'User',
        targetId: null,
        repositoryIds: [BigInt(1), BigInt(2)],
        permissions: { metadata: 'read', contents: 'read' },
        events: ['push', 'pull_request'],
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.githubAppInstallation.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.githubAppInstallation.create).mockResolvedValue(mockCreated);

      const result = await upsertGitHubAppInstallation(mockInstallationData);

      expect(result).toEqual({
        id: 'uuid-1',
        installationId: BigInt(123456),
      });
      expect(prisma.githubAppInstallation.create).toHaveBeenCalledOnce();
      expect(prisma.githubAppInstallation.update).not.toHaveBeenCalled();
    });

    it('should update an existing installation', async () => {
      const mockExisting = {
        id: 'uuid-1',
        installationId: BigInt(123456),
        accountId: BigInt(789),
        accountType: 'User',
        accountLogin: 'testuser',
        targetType: 'User',
        targetId: null,
        repositoryIds: [BigInt(1)],
        permissions: { metadata: 'read' },
        events: ['push'],
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockExisting,
        repositoryIds: [BigInt(1), BigInt(2)],
        permissions: { metadata: 'read', contents: 'read' },
        events: ['push', 'pull_request'],
      };

      vi.mocked(prisma.githubAppInstallation.findUnique).mockResolvedValue(mockExisting);
      vi.mocked(prisma.githubAppInstallation.update).mockResolvedValue(mockUpdated);

      const result = await upsertGitHubAppInstallation(mockInstallationData);

      expect(result).toEqual({
        id: 'uuid-1',
        installationId: BigInt(123456),
      });
      expect(prisma.githubAppInstallation.update).toHaveBeenCalledOnce();
      expect(prisma.githubAppInstallation.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteGitHubAppInstallation', () => {
    it('should delete an existing installation', async () => {
      const mockExisting = {
        id: 'uuid-1',
        installationId: BigInt(123456),
        accountId: BigInt(789),
        accountType: 'User',
        accountLogin: 'testuser',
        targetType: 'User',
        targetId: null,
        repositoryIds: [BigInt(1), BigInt(2)],
        permissions: { metadata: 'read' },
        events: ['push'],
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.githubAppInstallation.findUnique).mockResolvedValue(mockExisting);
      vi.mocked(prisma.githubAppInstallation.delete).mockResolvedValue(mockExisting);

      await deleteGitHubAppInstallation(BigInt(123456));

      expect(prisma.githubAppInstallation.delete).toHaveBeenCalledOnce();
    });

    it('should not throw if installation does not exist', async () => {
      vi.mocked(prisma.githubAppInstallation.findUnique).mockResolvedValue(null);

      await expect(deleteGitHubAppInstallation(BigInt(123456))).resolves.not.toThrow();
      expect(prisma.githubAppInstallation.delete).not.toHaveBeenCalled();
    });
  });

  describe('getGitHubAppInstallationById', () => {
    it('should return installation when found', async () => {
      const mockInstallation = {
        id: 'uuid-1',
        installationId: BigInt(123456),
        accountId: BigInt(789),
        accountType: 'User',
        accountLogin: 'testuser',
        targetType: 'User',
        targetId: null,
        repositoryIds: [BigInt(1), BigInt(2)],
        permissions: { metadata: 'read' },
        events: ['push'],
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.githubAppInstallation.findUnique).mockResolvedValue(mockInstallation);

      const result = await getGitHubAppInstallationById(BigInt(123456));

      expect(result).toBeTruthy();
      expect(result?.installationId).toEqual(BigInt(123456));
    });

    it('should return null when installation not found', async () => {
      vi.mocked(prisma.githubAppInstallation.findUnique).mockResolvedValue(null);

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

      vi.mocked(prisma.githubAppInstallation.findMany).mockResolvedValue(mockInstallations);

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

      vi.mocked(prisma.githubAppInstallation.findMany).mockResolvedValue(mockInstallations);

      const result = await getGitHubAppInstallationsByAccount('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].accountLogin).toBe('testuser');
    });
  });
});

