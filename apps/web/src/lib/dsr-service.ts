import { prisma } from '@anchorpipe/database';

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

export async function requestDataExport(userId: string): Promise<any> {
  const now = new Date();
  const dueAt = addDays(now, DEFAULT_SLA_DAYS);

  const user = await prismaWithDsr.user.findUnique({
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

  if (!user) {
    throw new Error('User not found');
  }

  const exportPayload = {
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
        actingAs: 'actor',
        repoId: entry.repoId,
        action: entry.action,
        oldRole: entry.oldRole,
        newRole: entry.newRole,
        createdAt: entry.createdAt,
      })),
      ...user.roleAuditLogsAsTarget.map((entry: any) => ({
        actingAs: 'target',
        repoId: entry.repoId,
        action: entry.action,
        oldRole: entry.oldRole,
        newRole: entry.newRole,
        createdAt: entry.createdAt,
      })),
    ],
  };

  const request = await prismaWithDsr.dataSubjectRequest.create({
    data: {
      userId,
      type: DSR_TYPE.export,
      status: DSR_STATUS.completed,
      dueAt,
      processedAt: now,
      confirmationSentAt: now,
      exportData: exportPayload,
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

  await queueConfirmationTelemetry(userId, request.id, DSR_TYPE.export, DSR_STATUS.completed);

  return request as any;
}

export async function requestDataDeletion(userId: string, reason?: string): Promise<any> {
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
