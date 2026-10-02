export const INGESTION_SCHEMA_VERSION = 'test-report.v1' as const;

export type IngestionSource = 'local' | 'github-actions';

export type IngestionReceiptState =
  | 'accepted'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'quarantined'
  | 'failed'
  | 'replayed';

export type IngestionErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_ENVELOPE'
  | 'UNSUPPORTED_SCHEMA'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'MISSING_IDEMPOTENCY_KEY'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RECEIPT_NOT_FOUND';

export interface IngestionRun {
  providerRunId?: string;
  attempt: number;
  commitSha: string;
  ref?: string;
  framework: string;
}

export interface IngestionContent {
  mediaType: string;
  sizeBytes: number;
  sha256?: string;
  objectKey?: string;
}

export interface IngestionEnvelope {
  eventId: string;
  schemaVersion: typeof INGESTION_SCHEMA_VERSION;
  source: IngestionSource;
  occurredAt: string;
  run: IngestionRun;
  content: IngestionContent;
}

export interface AuthenticatedIngestionContext {
  tenantId: string;
  repoId: string;
  credentialId: string;
}

export interface IngestionReceiptView {
  ingestionId: string;
  state: IngestionReceiptState;
  statusUrl: string;
  duplicate: boolean;
}

export class IngestionContractError extends Error {
  readonly code: IngestionErrorCode;
  readonly httpStatus: 400 | 401 | 403 | 409 | 413 | 415;

  constructor(
    code: IngestionErrorCode,
    message: string,
    httpStatus: IngestionContractError['httpStatus']
  ) {
    super(message);
    this.name = 'IngestionContractError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
