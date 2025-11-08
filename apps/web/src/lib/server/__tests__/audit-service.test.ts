import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAuditLogs, writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from '../audit-service';

vi.mock('@anchorpipe/database', () => {
  const mockPrisma = {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
  };
});

describe('audit-service', () => {
  let prismaMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@anchorpipe/database');
    prismaMock = prisma as any;
  });

  describe('writeAuditLog', () => {
    it('creates audit log with sanitized metadata', async () => {
      const longMetadata = { notes: 'a'.repeat(5000) };

      await writeAuditLog({
        actorId: 'user-1',
        action: AUDIT_ACTIONS.loginSuccess,
        subject: AUDIT_SUBJECTS.user,
        subjectId: 'user-1',
        description: 'User logged in.',
        metadata: longMetadata,
        ipAddress: '203.0.113.42',
        userAgent: 'Vitest',
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalled();
      const call = prismaMock.auditLog.create.mock.calls[0][0];
      expect(call.data.actorId).toBe('user-1');
      expect(call.data.metadata).toEqual({
        truncated: true,
        note: 'Metadata exceeded storage limit',
      });
      expect(call.data.ipAddress).toBe('203.0.113.42');
      expect(call.data.userAgent).toBe('Vitest');
    });
  });

  describe('listAuditLogs', () => {
    it('returns audit logs ordered by createdAt', async () => {
      prismaMock.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'role_assigned',
          subject: 'repo',
          subjectId: 'repo-1',
          description: 'Assigned role',
          metadata: { targetUserId: 'user-1' },
          ipAddress: '203.0.113.1',
          userAgent: 'test',
          createdAt: new Date(),
          actor: { id: 'admin-1', email: 'admin@example.com', githubLogin: 'admin', name: 'Admin' },
        },
      ]);

      const logs = await listAuditLogs({ limit: 10, subject: AUDIT_SUBJECTS.repo });

      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subject: AUDIT_SUBJECTS.repo },
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('role_assigned');
      expect(logs[0].actor?.email).toBe('admin@example.com');
    });
  });
});
