import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  getUserRepoRole,
  assignRole,
  removeRole,
  getUserAbility,
  userHasAdminRole,
} from '../rbac-service';
import { RepoRole } from '../../rbac';
import { writeAuditLog } from '../audit-service';

// Mock Prisma client
vi.mock('@anchorpipe/database', () => {
  const mockPrisma = {
    userRepoRole: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    roleAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return {
    prisma: mockPrisma,
  };
});

vi.mock('./audit-service', () => ({
  AUDIT_ACTIONS: {
    roleAssigned: 'role_assigned',
    roleRemoved: 'role_removed',
  },
  AUDIT_SUBJECTS: {
    repo: 'repo',
  },
  writeAuditLog: vi.fn(),
}));

describe('RBAC Service', () => {
  const mockUserId = 'user-123';
  const mockRepoId = 'repo-456';
  const mockActorId = 'actor-789';

  let mockPrisma: any;
  const mockWriteAuditLog = writeAuditLog as unknown as Mock;

  function expectAuditLogCalled(action: string, repoId: string) {
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action,
        subject: 'repo',
        subjectId: repoId,
      })
    );
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@anchorpipe/database');
    mockPrisma = prisma as any;
  });

  describe('getUserRepoRole', () => {
    it('should return null for missing userId or repoId', async () => {
      expect(await getUserRepoRole('', mockRepoId)).toBeNull();
      expect(await getUserRepoRole(mockUserId, '')).toBeNull();
    });

    it('should return null when role does not exist', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValue(null);

      const result = await getUserRepoRole(mockUserId, mockRepoId);
      expect(result).toBeNull();
    });

    it('should return role when it exists', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValue({
        role: RepoRole.ADMIN,
      });

      const result = await getUserRepoRole(mockUserId, mockRepoId);
      expect(result).toBe(RepoRole.ADMIN);
    });
  });

  describe('assignRole', () => {
    it('should throw error if actor does not have admin permission', async () => {
      // Mock actor has no role (null)
      mockPrisma.userRepoRole.findUnique.mockResolvedValue(null);

      await expect(
        assignRole(mockActorId, mockUserId, mockRepoId, RepoRole.MEMBER)
      ).rejects.toThrow('Permission denied: only admins can assign roles');
    });

    it('should assign role when actor has admin permission', async () => {
      // Mock actor has admin role
      mockPrisma.userRepoRole.findUnique
        .mockResolvedValueOnce({ role: RepoRole.ADMIN }) // Actor's role check
        .mockResolvedValueOnce(null); // Existing role check (no existing role)

      mockPrisma.userRepoRole.upsert.mockResolvedValue({
        userId: mockUserId,
        repoId: mockRepoId,
        role: RepoRole.MEMBER,
      });

      mockPrisma.roleAuditLog.create.mockResolvedValue({});

      await assignRole(mockActorId, mockUserId, mockRepoId, RepoRole.MEMBER);

      expect(mockPrisma.userRepoRole.upsert).toHaveBeenCalled();
      expect(mockPrisma.roleAuditLog.create).toHaveBeenCalled();
      expectAuditLogCalled('role_assigned', mockRepoId);
    });
  });

  describe('removeRole', () => {
    it('should throw error if actor does not have admin permission', async () => {
      // Mock actor has no role (null)
      mockPrisma.userRepoRole.findUnique.mockResolvedValue(null);

      await expect(removeRole(mockActorId, mockUserId, mockRepoId)).rejects.toThrow(
        'Permission denied: only admins can remove roles'
      );
    });

    it('should remove role when actor has admin permission', async () => {
      // Mock actor has admin role
      mockPrisma.userRepoRole.findUnique
        .mockResolvedValueOnce({ role: RepoRole.ADMIN }) // Actor's role check
        .mockResolvedValueOnce({ role: RepoRole.MEMBER }); // Existing role check

      mockPrisma.userRepoRole.delete.mockResolvedValue({});
      mockPrisma.roleAuditLog.create.mockResolvedValue({});

      await removeRole(mockActorId, mockUserId, mockRepoId);

      expect(mockPrisma.userRepoRole.delete).toHaveBeenCalled();
      expect(mockPrisma.roleAuditLog.create).toHaveBeenCalled();
      expectAuditLogCalled('role_removed', mockRepoId);
    });
  });

  describe('userHasAdminRole', () => {
    it('returns true when user has admin role', async () => {
      mockPrisma.userRepoRole.findFirst.mockResolvedValue({ id: 'role-1' });
      const result = await userHasAdminRole(mockUserId);
      expect(result).toBe(true);
    });

    it('returns false when user has no admin role', async () => {
      mockPrisma.userRepoRole.findFirst.mockResolvedValue(null);
      const result = await userHasAdminRole(mockUserId);
      expect(result).toBe(false);
    });
  });

  describe('getUserAbility', () => {
    it('should return ability based on user role', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValue({ role: RepoRole.ADMIN });

      const ability = await getUserAbility(mockUserId, mockRepoId);
      expect(ability.can('admin', 'role')).toBe(true);
      expect(ability.can('read', 'repo')).toBe(true);
    });

    it('should return ability with no permissions when role is null', async () => {
      mockPrisma.userRepoRole.findUnique.mockResolvedValue(null);

      const ability = await getUserAbility(mockUserId, mockRepoId);
      expect(ability.can('read', 'repo')).toBe(false);
      expect(ability.can('admin', 'role')).toBe(false);
    });
  });
});
