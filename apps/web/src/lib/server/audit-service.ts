import { prisma } from '@anchorpipe/database';
import type { NextRequest } from 'next/server';

const prismaWithAudit = prisma as any;

export const AUDIT_ACTIONS = {
  loginSuccess: 'login_success',
  loginFailure: 'login_failure',
  userCreated: 'user_created',
  roleAssigned: 'role_assigned',
  roleRemoved: 'role_removed',
  dsrExportRequest: 'dsr_export_request',
  dsrExportDownload: 'dsr_export_download',
  dsrDeletionRequest: 'dsr_deletion_request',
  configUpdated: 'config_updated',
  tokenCreated: 'token_created',
  tokenRevoked: 'token_revoked',
  hmacAuthSuccess: 'hmac_auth_success',
  hmacAuthFailure: 'hmac_auth_failure',
  hmacSecretCreated: 'hmac_secret_created',
  hmacSecretRevoked: 'hmac_secret_revoked',
  hmacSecretRotated: 'hmac_secret_rotated',
  other: 'other',
} as const;

export const AUDIT_SUBJECTS = {
  user: 'user',
  repo: 'repo',
  dsr: 'dsr',
  configuration: 'configuration',
  security: 'security',
  session: 'session',
  token: 'token',
  system: 'system',
} as const;

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
type AuditSubject = (typeof AUDIT_SUBJECTS)[keyof typeof AUDIT_SUBJECTS];

export interface AuditLogInput {
  actorId?: string | null;
  action: AuditAction;
  subject: AuditSubject;
  subjectId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogQuery {
  limit?: number;
  subject?: AuditSubject;
  actorId?: string;
  cursor?: string;
}

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

const MAX_METADATA_LENGTH = 4000;
const MAX_TEXT_LENGTH = 255;

function sanitizeMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata) return null;
  try {
    const cleaned = JSON.parse(JSON.stringify(metadata));
    const serialized = JSON.stringify(cleaned);
    if (serialized.length > MAX_METADATA_LENGTH) {
      return {
        truncated: true,
        note: 'Metadata exceeded storage limit',
      };
    }
    return cleaned;
  } catch (error) {
    console.warn('Failed to sanitize audit metadata', error);
    return {
      truncated: true,
      note: 'Serialization failed',
    };
  }
}

function clampText(value?: string | null, max = MAX_TEXT_LENGTH) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prismaWithAudit.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        subject: input.subject,
        subjectId: input.subjectId ?? null,
        description: clampText(input.description ?? null, 512),
        metadata: sanitizeMetadata(input.metadata ?? null),
        ipAddress: clampText(input.ipAddress ?? null, 45),
        userAgent: clampText(input.userAgent ?? null, 512),
      },
    });
  } catch (error) {
    console.error('Failed to write audit log', error);
  }
}

export async function listAuditLogs(query: AuditLogQuery = {}): Promise<any[]> {
  const where: Record<string, unknown> = {};
  if (query.subject) {
    where.subject = query.subject;
  }
  if (query.actorId) {
    where.actorId = query.actorId;
  }

  const take = Math.min(Math.max(query.limit ?? 50, 1), 200);

  const logs = await prismaWithAudit.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    ...(query.cursor
      ? {
          cursor: { id: query.cursor },
          skip: 1,
        }
      : {}),
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          githubLogin: true,
          name: true,
        },
      },
    },
  });

  return logs.map((log: any) => ({
    id: log.id,
    action: log.action,
    subject: log.subject,
    subjectId: log.subjectId,
    description: log.description,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    actor: log.actor ?? null,
  }));
}

export function extractRequestContext(request: NextRequest): RequestContext {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipCandidate = forwarded?.split(',')[0]?.trim() || (request as any).ip || null;
  const userAgent = request.headers.get('user-agent');

  return {
    ipAddress: ipCandidate ?? null,
    userAgent: userAgent ?? null,
  };
}
