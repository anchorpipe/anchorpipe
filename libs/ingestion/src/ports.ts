import type {
  AuthenticatedIngestionContext,
  IngestionEnvelope,
  IngestionReceiptView,
} from './contracts';

export interface AcceptIngestionCommand {
  context: AuthenticatedIngestionContext;
  clientKey: string;
  requestHash: string;
  envelope: IngestionEnvelope;
  objectKey: string;
}

export interface IngestionReceiptPort {
  /**
   * Atomically claims the tenant/client key and creates the receipt + outbox.
   * Implementations must return the existing receipt for an identical replay,
   * and reject a changed request hash without overwriting the original.
   */
  accept(command: AcceptIngestionCommand): Promise<IngestionReceiptView>;
}

export interface IngestionObjectPort {
  /** Persist exact bytes before the database acceptance transaction. */
  put(command: {
    objectKey: string;
    bytes: Uint8Array;
    mediaType: string;
    sha256: string;
  }): Promise<void>;
}

export interface IngestionApplicationPorts {
  receipts: IngestionReceiptPort;
  objects: IngestionObjectPort;
}
