import { prisma, Prisma } from '@anchorpipe/database';
import {
  IngestionContractError,
  type AcceptIngestionCommand,
  type AuthenticatedIngestionContext,
  type IngestionReceiptPort,
  type IngestionReceiptView,
} from '@anchorpipe/ingestion';
import { createMinioClient, uploadFile } from '@anchorpipe/storage';
import type { Client } from 'minio';

const RECEIPT_EVENT_TYPE = 'ingestion.accepted';
const RECEIPT_EVENT_VERSION = 1;
const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000;

function nowPlus(ms: number): Date {
  return new Date(Date.now() + ms);
}

function toReceiptView(receiptId: string, duplicate: boolean): IngestionReceiptView {
  return {
    ingestionId: receiptId,
    state: 'accepted',
    statusUrl: `/api/v1/ingestions/${receiptId}`,
    duplicate,
  };
}

export class ReceiptPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptPersistenceError';
  }
}

export class PostgresIngestionReceiptPort implements IngestionReceiptPort {
  async accept(command: AcceptIngestionCommand): Promise<IngestionReceiptView> {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.ingestionReceipt.findUnique({
          where: {
            tenantId_clientKey: {
              tenantId: command.context.tenantId,
              clientKey: command.clientKey,
            },
          },
          select: { id: true, requestHash: true },
        });

        if (existing) {
          if (existing.requestHash !== command.requestHash) {
            throw new IngestionContractError(
              'IDEMPOTENCY_CONFLICT',
              'The idempotency key was already used for a different request.',
              409
            );
          }
          return toReceiptView(existing.id, true);
        }

        const repo = await tx.repo.findFirst({
          where: { id: command.context.repoId, tenantId: command.context.tenantId },
          select: { id: true },
        });
        if (!repo) {
          throw new IngestionContractError(
            'FORBIDDEN',
            'Repository is not owned by this tenant.',
            403
          );
        }

        const receipt = await tx.ingestionReceipt.create({
          data: {
            tenantId: command.context.tenantId,
            repoId: command.context.repoId,
            clientKey: command.clientKey,
            requestHash: command.requestHash,
            eventId: command.envelope.eventId,
            schemaVersion: command.envelope.schemaVersion,
            source: command.envelope.source,
            mediaType: command.envelope.content.mediaType,
            sizeBytes: command.envelope.content.sizeBytes,
            objectKey: command.objectKey,
            providerRunId: command.envelope.run.providerRunId,
            commitSha: command.envelope.run.commitSha,
            observedRef: command.envelope.run.ref,
            framework: command.envelope.run.framework,
            occurredAt: new Date(command.envelope.occurredAt),
          },
          select: { id: true },
        });

        await tx.idempotencyKey.create({
          data: {
            key: `${command.context.tenantId}:${command.clientKey}`,
            tenantId: command.context.tenantId,
            clientKey: command.clientKey,
            requestHash: command.requestHash,
            receiptId: receipt.id,
            repoId: command.context.repoId,
            commitSha: command.envelope.run.commitSha,
            runId: command.envelope.run.providerRunId,
            framework: command.envelope.run.framework,
            expiresAt: nowPlus(IDEMPOTENCY_RETENTION_MS),
          },
        });

        await tx.outboxEvent.create({
          data: {
            tenantId: command.context.tenantId,
            receiptId: receipt.id,
            eventType: RECEIPT_EVENT_TYPE,
            eventVersion: RECEIPT_EVENT_VERSION,
            payload: {
              receiptId: receipt.id,
              eventId: command.envelope.eventId,
              tenantId: command.context.tenantId,
              repoId: command.context.repoId,
              schemaVersion: command.envelope.schemaVersion,
            },
          },
        });

        return toReceiptView(receipt.id, false);
      });
    } catch (error) {
      if (error instanceof IngestionContractError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.ingestionReceipt.findUnique({
          where: {
            tenantId_clientKey: {
              tenantId: command.context.tenantId,
              clientKey: command.clientKey,
            },
          },
          select: { id: true, requestHash: true },
        });
        if (existing?.requestHash === command.requestHash) {
          return toReceiptView(existing.id, true);
        }
        if (existing) {
          throw new IngestionContractError(
            'IDEMPOTENCY_CONFLICT',
            'The idempotency key was already used for a different request.',
            409
          );
        }
      }
      throw new ReceiptPersistenceError('Unable to durably accept the ingestion request.');
    }
  }
}

let objectStoreClient: Client | undefined;

function configuredObjectStore(): { client: Client; bucket: string } {
  if (objectStoreClient) {
    return {
      client: objectStoreClient,
      bucket: process.env.INGESTION_BUCKET || process.env.S3_BUCKET || 'anchorpipe-ingestion',
    };
  }

  const endPoint = process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY || process.env.S3_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY || process.env.S3_SECRET_KEY;
  if (!endPoint || !accessKey || !secretKey) {
    throw new ReceiptPersistenceError('Ingestion object storage is not configured.');
  }

  objectStoreClient = createMinioClient({
    endPoint,
    port: Number(process.env.MINIO_PORT || process.env.S3_PORT || 9000),
    useSSL: (process.env.MINIO_USE_SSL || process.env.S3_USE_SSL) === 'true',
    accessKey,
    secretKey,
  });

  return {
    client: objectStoreClient,
    bucket: process.env.INGESTION_BUCKET || process.env.S3_BUCKET || 'anchorpipe-ingestion',
  };
}

export const ingestionObjectPort = {
  async put(command: { objectKey: string; bytes: Uint8Array; mediaType: string; sha256: string }) {
    const { client, bucket } = configuredObjectStore();
    const bytes = Buffer.from(command.bytes);
    await uploadFile(client, {
      bucketName: bucket,
      objectName: command.objectKey,
      data: bytes,
      contentType: command.mediaType,
    });
  },
};

export function contextFromHmac(params: {
  tenantId: string | null;
  repoId: string;
  secretId?: string;
}): AuthenticatedIngestionContext {
  if (!params.tenantId) {
    throw new IngestionContractError('FORBIDDEN', 'Repository is not assigned to a tenant.', 403);
  }
  return {
    tenantId: params.tenantId,
    repoId: params.repoId,
    credentialId: params.secretId || 'legacy-hmac',
  };
}
