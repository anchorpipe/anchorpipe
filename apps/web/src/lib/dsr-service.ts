import { prisma } from '@anchorpipe/database';
import { AUDIT_ACTIONS, AUDIT_SUBJECTS, RequestContext, writeAuditLog } from './audit-service';

const prismaWithDsr = prisma as any;
const DEFAULT_SLA_DAYS = parseInt(process.env.DSR_SLA_DAYS ?? '30', 10);

const DSR_STATUS = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
} as const;

const DSR_TYPE = {
  export: 'export',
  deletion: 'deletion',
} as const;

type DsrStatus = (typeof DSR_STATUS)[keyof typeof DSR_STATUS];
type DsrType = (typeof DSR_TYPE)[keyof typeof DSR_TYPE];

interface DsrExportPayload {
  user: {
    id: string;
    email: string | null;
    githubLogin: string | null;
    name: string | null;
    telemetryOptIn: boolean;
    createdAt: Date;
    preferences: unknown;
  };
  repoRoles: Array<{
    repoId: string;
    role: string;
    assignedBy: string | null;
    createdAt: Date;
    repo: {
      id: string;
      name: string;
      owner: string;
    };
  }>;
  roleAuditLogs: Array<{
    actingAs: 'actor' | 'target';
    repoId: string;
    action: string;
    oldRole: string | null;
    newRole: string | null;
    createdAt: Date;
  }>;
}

function addDays(base: Date, days: number): Date {
  const clone = new Date(base.getTime());
  clone.setUTCDate(clone.getUTCDate() + days);
  return clone;
}

async function recordEvent(requestId: string, status: DsrStatus, message: string) {
  await prismaWithDsr.dataSubjectRequestEvent.create({
    data: {
      requestId,
      status,
      message,
    },
  });
}

async function queueConfirmationTelemetry(
  userId: string,
  requestId: string,
  type: DsrType,
  status: DsrStatus
) {
  try {
    await prismaWithDsr.telemetryEvent.create({
      data: {
        userId,
        eventType: 'dsr.email_queued',
        eventData: {
          requestId,
          type,
          status,
        },
      },
    });
  } catch (error) {
    console.warn('Failed to queue DSR telemetry event', error);
  }
}

function redactUserForDeletion(user: any) {
  return {
    id: user.id,
    emailBefore: user.email,
    githubLoginBefore: user.githubLogin,
    nameBefore: user.name,
    hadPreferences: Boolean(user.preferences),
  };
}

export async function listDataSubjectRequests(userId: string): Promise<any[]> {
  return (await prismaWithDsr.dataSubjectRequest.findMany({
    where: { userId },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { requestedAt: 'desc' },
  })) as any[];
}

async function fetchUserForExport(userId: string) {
  return prismaWithDsr.user.findUnique({
    where: { id: userId },
    include: {
      repoRoles: {
        include: {
          repo: {
            select: {
              id: true,
              name: true,
              owner: true,
            },
          },
        },
      },
      roleAuditLogsAsActor: {
        orderBy: { createdAt: 'desc' },
        take: 25,
      },
      roleAuditLogsAsTarget: {
        orderBy: { createdAt: 'desc' },
        take: 25,
      },
    },
  });
}

function buildExportPayload(user: any): DsrExportPayload {
  return {
    user: {
      id: user.id,
      email: user.email,
      githubLogin: user.githubLogin,
      name: user.name,
      telemetryOptIn: user.telemetryOptIn,
      createdAt: user.createdAt,
      preferences: user.preferences,
    },
    repoRoles: user.repoRoles.map((role: any) => ({
      repoId: role.repoId,
      role: role.role,
      assignedBy: role.assignedBy,
      createdAt: role.createdAt,
      repo: role.repo,
    })),
    roleAuditLogs: [
      ...user.roleAuditLogsAsActor.map((entry: any) => ({
        actingAs: 'actor' as const,
        repoId: entry.repoId,
        action: entry.action,
        oldRole: entry.oldRole,
        newRole: entry.newRole,
        createdAt: entry.createdAt,
      })),
      ...user.roleAuditLogsAsTarget.map((entry: any) => ({
        actingAs: 'target' as const,
        repoId: entry.repoId,
        action: entry.action,
        oldRole: entry.oldRole,
        newRole: entry.newRole,
        createdAt: entry.createdAt,
      })),
    ],
  };
}

async function createExportRequest(
  userId: string,
  payload: DsrExportPayload,
  dueAt: Date,
  now: Date
) {
  return prismaWithDsr.dataSubjectRequest.create({
    data: {
      userId,
      type: DSR_TYPE.export,
      status: DSR_STATUS.completed,
      dueAt,
      processedAt: now,
      confirmationSentAt: now,
      exportData: payload,
      events: {
        create: [
          {
            status: DSR_STATUS.pending,
            message: 'Export request received.',
          },
          {
            status: DSR_STATUS.processing,
            message: 'Compiling export payload.',
          },
          {
            status: DSR_STATUS.completed,
            message: 'Export completed and available for download.',
          },
        ],
      },
    },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

async function logExportAudit(
  userId: string,
  requestId: string,
  payload: DsrExportPayload,
  context?: RequestContext
) {
  await writeAuditLog({
    actorId: userId,
    action: AUDIT_ACTIONS.dsrExportRequest,
    subject: AUDIT_SUBJECTS.dsr,
    subjectId: requestId,
    description: 'User generated data export payload.',
    metadata: {
      status: DSR_STATUS.completed,
      roleCount: payload.repoRoles.length,
    },
    ipAddress: context?.ipAddress ?? null,
    userAgent: context?.userAgent ?? null,
  });
}

async function logDeletionAudit(
  userId: string,
  requestId: string,
  status: DsrStatus,
  extraMetadata: Record<string, unknown>,
  context?: RequestContext
) {
  await writeAuditLog({
    actorId: userId,
    action: AUDIT_ACTIONS.dsrDeletionRequest,
    subject: AUDIT_SUBJECTS.dsr,
    subjectId: requestId,
    description:
      status === DSR_STATUS.processing
        ? 'User initiated data deletion workflow.'
        : 'User deletion workflow completed.',
    metadata: {
      status,
      ...extraMetadata,
    },
    ipAddress: context?.ipAddress ?? null,
    userAgent: context?.userAgent ?? null,
  });
}

export async function requestDataExport(userId: string, context?: RequestContext): Promise<any> {
  const now = new Date();
  const dueAt = addDays(now, DEFAULT_SLA_DAYS);

  const user = await fetchUserForExport(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const exportPayload = buildExportPayload(user);
  const request = await createExportRequest(userId, exportPayload, dueAt, now);

  await queueConfirmationTelemetry(userId, request.id, DSR_TYPE.export, DSR_STATUS.completed);
  await logExportAudit(userId, request.id, exportPayload, context);

  return request as any;
}

export async function requestDataDeletion(
  userId: string,
  reason?: string,
  context?: RequestContext
): Promise<any> {
  const now = new Date();
  const dueAt = addDays(now, DEFAULT_SLA_DAYS);

  const user = await prismaWithDsr.user.findUnique({
    where: { id: userId },
    include: {
      repoRoles: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const request = await prismaWithDsr.dataSubjectRequest.create({
    data: {
      userId,
      type: DSR_TYPE.deletion,
      status: DSR_STATUS.processing,
      dueAt,
      metadata: reason
        ? {
            requestedReason: reason,
          }
        : undefined,
      events: {
        create: [
          {
            status: DSR_STATUS.pending,
            message: 'Deletion request received.',
          },
          {
            status: DSR_STATUS.processing,
            message: 'Beginning deletion workflow.',
          },
        ],
      },
    },
  });

  const summary = redactUserForDeletion(user);

  await logDeletionAudit(
    userId,
    request.id,
    DSR_STATUS.processing,
    {
      reason: reason ?? null,
    },
    context
  );

  await prismaWithDsr.$transaction([
    prismaWithDsr.session.deleteMany({ where: { userId } }),
    prismaWithDsr.account.deleteMany({ where: { userId } }),
    prismaWithDsr.userRepoRole.deleteMany({ where: { userId } }),
    prismaWithDsr.user.update({
      where: { id: userId },
      data: {
        email: null,
        githubLogin: null,
        name: null,
        telemetryOptIn: false,
        preferences: null,
      },
    }),
    prismaWithDsr.dataSubjectRequest.update({
      where: { id: request.id },
      data: {
        status: DSR_STATUS.completed,
        processedAt: now,
        confirmationSentAt: now,
        metadata: {
          ...((reason ? { requestedReason: reason } : {}) as object),
          ...summary,
          rolesRemoved: user.repoRoles.length,
          processedAt: now.toISOString(),
        },
      },
    }),
  ]);

  await recordEvent(
    request.id,
    DSR_STATUS.completed,
    'Personal data redacted; deletion completed.'
  );
  await queueConfirmationTelemetry(userId, request.id, DSR_TYPE.deletion, DSR_STATUS.completed);

  const updated = await prismaWithDsr.dataSubjectRequest.findUnique({
    where: { id: request.id },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  await logDeletionAudit(
    userId,
    request.id,
    DSR_STATUS.completed,
    {
      rolesRemoved: user.repoRoles.length,
    },
    context
  );

  return updated as any;
}

export async function getExportPayload(userId: string, requestId: string) {
  const request = await prismaWithDsr.dataSubjectRequest.findFirst({
    where: {
      id: requestId,
      userId,
      type: DSR_TYPE.export,
    },
  });

  if (!request || request.status !== DSR_STATUS.completed) {
    throw new Error('Export not available');
  }

  return request.exportData ?? {};
}
