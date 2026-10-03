import { createHash } from 'node:crypto';
import {
  INGESTION_SCHEMA_VERSION,
  IngestionContractError,
  type AuthenticatedIngestionContext,
  type IngestionEnvelope,
  type IngestionReceiptView,
} from './contracts';
import type { IngestionApplicationPorts } from './ports';

export const DEFAULT_MAX_BODY_BYTES = 50 * 1024 * 1024;

export interface AcceptIngestionInput {
  context: AuthenticatedIngestionContext;
  clientKey: string;
  rawBody: Uint8Array;
  contentType: string;
  maxBodyBytes?: number;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseEnvelope(rawBody: Uint8Array): IngestionEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    throw new IngestionContractError('INVALID_JSON', 'Request body is not valid JSON.', 400);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IngestionContractError('INVALID_ENVELOPE', 'Request body must be an object.', 400);
  }

  const candidate = value as Record<string, unknown>;
  const run = candidate.run;
  const content = candidate.content;
  if (
    candidate.schema_version !== undefined &&
    candidate.schema_version !== INGESTION_SCHEMA_VERSION
  ) {
    throw new IngestionContractError('UNSUPPORTED_SCHEMA', 'Unsupported ingestion schema.', 400);
  }

  if (
    candidate.schema_version !== INGESTION_SCHEMA_VERSION ||
    typeof candidate.event_id !== 'string' ||
    candidate.event_id.length < 1 ||
    candidate.event_id.length > 255 ||
    (candidate.source !== 'local' && candidate.source !== 'github-actions') ||
    typeof candidate.occurred_at !== 'string' ||
    Number.isNaN(Date.parse(candidate.occurred_at)) ||
    !run ||
    typeof run !== 'object' ||
    !content ||
    typeof content !== 'object'
  ) {
    throw new IngestionContractError('INVALID_ENVELOPE', 'Ingestion envelope is invalid.', 400);
  }

  const runValue = run as Record<string, unknown>;
  const contentValue = content as Record<string, unknown>;
  if (
    typeof runValue.attempt !== 'number' ||
    !Number.isInteger(runValue.attempt) ||
    runValue.attempt < 1 ||
    typeof runValue.commit_sha !== 'string' ||
    !/^[0-9a-f]{40}$/i.test(runValue.commit_sha) ||
    typeof runValue.framework !== 'string' ||
    runValue.framework.length < 1 ||
    runValue.framework.length > 64 ||
    typeof contentValue.media_type !== 'string' ||
    contentValue.media_type.length < 1 ||
    contentValue.media_type.length > 255 ||
    contentValue.media_type.toLowerCase() !== 'application/json'
  ) {
    throw new IngestionContractError(
      'INVALID_ENVELOPE',
      'Ingestion run or content metadata is invalid.',
      400
    );
  }

  return {
    eventId: candidate.event_id,
    schemaVersion: INGESTION_SCHEMA_VERSION,
    source: candidate.source,
    occurredAt: candidate.occurred_at,
    run: {
      providerRunId:
        typeof runValue.provider_run_id === 'string' ? runValue.provider_run_id : undefined,
      attempt: runValue.attempt,
      commitSha: runValue.commit_sha,
      ref: typeof runValue.ref === 'string' ? runValue.ref : undefined,
      framework: runValue.framework,
    },
    content: {
      mediaType: contentValue.media_type,
      sizeBytes: 0,
    },
  };
}

export async function acceptIngestion(
  input: AcceptIngestionInput,
  ports: IngestionApplicationPorts
): Promise<IngestionReceiptView> {
  if (!input.clientKey || input.clientKey.length > 255) {
    throw new IngestionContractError(
      'MISSING_IDEMPOTENCY_KEY',
      'A valid Idempotency-Key is required.',
      400
    );
  }

  const maxBodyBytes = input.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  if (input.rawBody.byteLength === 0 || input.rawBody.byteLength > maxBodyBytes) {
    throw new IngestionContractError(
      'PAYLOAD_TOO_LARGE',
      'Request body exceeds the configured limit.',
      413
    );
  }

  if (!input.contentType.toLowerCase().startsWith('application/json')) {
    throw new IngestionContractError(
      'UNSUPPORTED_MEDIA_TYPE',
      'Only application/json is supported.',
      415
    );
  }

  const envelope = parseEnvelope(input.rawBody);
  const requestHash = sha256Hex(input.rawBody);
  const objectKey = `tenants/${input.context.tenantId}/repos/${input.context.repoId}/objects/${requestHash}`;

  await ports.objects.put({
    objectKey,
    bytes: input.rawBody,
    mediaType: envelope.content.mediaType,
    sha256: requestHash,
  });

  return ports.receipts.accept({
    context: input.context,
    clientKey: input.clientKey,
    requestHash,
    envelope: {
      ...envelope,
      content: {
        ...envelope.content,
        sizeBytes: input.rawBody.byteLength,
        sha256: requestHash,
        objectKey,
      },
    },
    objectKey,
  });
}
