import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  getExportPayload,
  listDataSubjectRequests,
  requestDataDeletion,
  requestDataExport,
} from '../dsr-service';
import { writeAuditLog } from '../audit-service';

vi.mock('@anchorpipe/database', () => {
  const mockPrisma = {
    dataSubjectRequest: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    dataSubjectRequestEvent: {
      create: vi.fn(),
    },
    telemetryEvent: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    account: {
      deleteMany: vi.fn(),
    },
    userRepoRole: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (operations: any[]) => {
      await Promise.all(operations);
    }),
  };

  return {
    prisma: mockPrisma,
  };
});

vi.mock('./audit-service', () => ({
  AUDIT_ACTIONS: {
    dsrExportRequest: 'dsr_export_request',
    dsrDeletionRequest: 'dsr_deletion_request',
    dsrExportDownload: 'dsr_export_download',
  },
  AUDIT_SUBJECTS: {
    dsr: 'dsr',
  },
  writeAuditLog: vi.fn(),
}));

describe('DSR Service', () => {
  let prismaMock: any;
  const mockWriteAuditLog = writeAuditLog as unknown as Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@anchorpipe/database');
    prismaMock = prisma as any;
  });

  describe('listDataSubjectRequests', () => {
    it('returns serialized requests for the user', async () => {
      prismaMock.dataSubjectRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          type: 'export',
          status: 'completed',
          requestedAt: new Date(),
          dueAt: new Date(),
          events: [],
        },
      ]);

      const result = await listDataSubjectRequests('user-1');
      expect(result).toHaveLength(1);
      expect(prismaMock.dataSubjectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });
  });

  describe('requestDataExport', () => {
    it('creates export request with completed status and telemetry event', async () => {
      const now = new Date();

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        githubLogin: 'user-gh',
        name: 'User One',
        telemetryOptIn: true,
        createdAt: now,
        preferences: { theme: 'dark' },
        repoRoles: [],
        roleAuditLogsAsActor: [],
        roleAuditLogsAsTarget: [],
      });

      prismaMock.dataSubjectRequest.create.mockResolvedValue({
        id: 'req-export',
        status: 'completed',
        requestedAt: now,
        dueAt: now,
        processedAt: now,
        confirmationSentAt: now,
        events: [],
      });

      const request = await requestDataExport('user-1');

      expect(prismaMock.dataSubjectRequest.create).toHaveBeenCalled();
      expect(prismaMock.dataSubjectRequest.create.mock.calls[0][0].data.status).toBe('completed');
      expect(prismaMock.telemetryEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'dsr.email_queued' }),
        })
      );
      expect(request.status).toBe('completed');
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dsr_export_request',
          subject: 'dsr',
        })
      );
    });
  });

  describe('requestDataDeletion', () => {
    it('redacts user data and completes the request', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        githubLogin: 'user-gh',
        name: 'User One',
        telemetryOptIn: true,
        preferences: { theme: 'dark' },
        repoRoles: [{ repoId: 'repo-1' }],
      });

      prismaMock.dataSubjectRequest.create.mockResolvedValue({
        id: 'req-delete',
      });

      prismaMock.dataSubjectRequest.findUnique.mockResolvedValue({
        id: 'req-delete',
        status: 'completed',
        metadata: {
          rolesRemoved: 1,
        },
        events: [],
      });

      const result = await requestDataDeletion('user-1', 'No longer using the service');

      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          email: null,
          githubLogin: null,
        }),
      });
      expect(prismaMock.telemetryEvent.create).toHaveBeenCalled();
      expect(result?.status).toBe('completed');
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dsr_deletion_request',
          subject: 'dsr',
        })
      );
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ status: 'completed' }),
        })
      );
    });
  });

  describe('getExportPayload', () => {
    it('returns stored export payload when available', async () => {
      prismaMock.dataSubjectRequest.findFirst.mockResolvedValue({
        id: 'req-export',
        status: 'completed',
        exportData: { hello: 'world' },
      });

      const payload = await getExportPayload('user-1', 'req-export');
      expect(payload).toEqual({ hello: 'world' });
    });

    it('throws when export not available', async () => {
      prismaMock.dataSubjectRequest.findFirst.mockResolvedValue(null);
      await expect(getExportPayload('user-1', 'missing')).rejects.toThrow('Export not available');
    });
  });
});
