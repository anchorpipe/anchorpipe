import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignDefaultRole, assignDefaultRoleOnUserCreate, assignDefaultRoleOnRepoCreate } from '../rbac-defaults';
import { RepoRole } from '../rbac';

const mockPrisma = vi.hoisted(() => ({
  userRepoRole: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  roleAuditLog: {
    create: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

describe('rbac-defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignDefaultRole', () => {
    it('skips assignment when role already exists', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValueOnce({
        userId: 'user-1',
        repoId: 'repo-1',
        role: RepoRole.MEMBER,
      });

      await assignDefaultRole('user-1', 'repo-1');

      expect(mockPrisma.userRepoRole.create).not.toHaveBeenCalled();
      expect(mockPrisma.roleAuditLog.create).not.toHaveBeenCalled();
    });

    it('assigns default member role when none exists', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValueOnce(null);
      mockPrisma.userRepoRole.create.mockResolvedValueOnce({});
      mockPrisma.roleAuditLog.create.mockResolvedValueOnce({});

      await assignDefaultRole('user-1', 'repo-1');

      expect(mockPrisma.userRepoRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          repoId: 'repo-1',
          role: RepoRole.MEMBER,
          assignedBy: 'user-1',
        },
      });
      expect(mockPrisma.roleAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-1',
          targetUserId: 'user-1',
          repoId: 'repo-1',
          action: 'assigned',
          oldRole: null,
          newRole: RepoRole.MEMBER,
          metadata: {
            source: 'default',
            reason: 'Default role assignment',
          },
        }),
      });
    });

    it('assigns custom default role when provided', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValueOnce(null);
      mockPrisma.userRepoRole.create.mockResolvedValueOnce({});
      mockPrisma.roleAuditLog.create.mockResolvedValueOnce({});

      await assignDefaultRole('user-1', 'repo-1', RepoRole.ADMIN);

      expect(mockPrisma.userRepoRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: RepoRole.ADMIN,
        }),
      });
    });
  });

  describe('assignDefaultRoleOnUserCreate', () => {
    it('skips assignment when no repoId provided', async () => {
      await assignDefaultRoleOnUserCreate('user-1');

      expect(mockPrisma.userRepoRole.findUnique).not.toHaveBeenCalled();
    });

    it('assigns default role when repoId provided', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValueOnce(null);
      mockPrisma.userRepoRole.create.mockResolvedValueOnce({});
      mockPrisma.roleAuditLog.create.mockResolvedValueOnce({});

      await assignDefaultRoleOnUserCreate('user-1', 'repo-1');

      expect(mockPrisma.userRepoRole.findUnique).toHaveBeenCalled();
    });
  });

  describe('assignDefaultRoleOnRepoCreate', () => {
    it('assigns admin role to repository creator', async () => {
      mockPrisma.userRepoRole.create.mockResolvedValueOnce({});
      mockPrisma.roleAuditLog.create.mockResolvedValueOnce({});

      await assignDefaultRoleOnRepoCreate('repo-1', 'creator-1');

      expect(mockPrisma.userRepoRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'creator-1',
          repoId: 'repo-1',
          role: RepoRole.ADMIN,
          assignedBy: 'creator-1',
        },
      });
      expect(mockPrisma.roleAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'creator-1',
          targetUserId: 'creator-1',
          repoId: 'repo-1',
          action: 'assigned',
          oldRole: null,
          newRole: RepoRole.ADMIN,
          metadata: {
            source: 'repo_creation',
            reason: 'Repository creator gets admin role',
          },
        }),
      });
    });
  });
});

