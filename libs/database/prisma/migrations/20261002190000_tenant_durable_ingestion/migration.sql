-- Expand-only migration for the first durable ingestion slice.
-- tenant_id remains nullable on legacy repository rows until ownership is explicitly mapped.

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

ALTER TABLE "repos" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "idempotency_keys" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "idempotency_keys" ADD COLUMN "client_key" TEXT;
ALTER TABLE "idempotency_keys" ADD COLUMN "request_hash" TEXT;
ALTER TABLE "idempotency_keys" ADD COLUMN "receipt_id" TEXT;

CREATE TYPE "IngestionReceiptStatus" AS ENUM ('accepted', 'processing', 'completed', 'partial', 'quarantined', 'failed', 'replayed');
CREATE TYPE "OutboxEventStatus" AS ENUM ('pending', 'published', 'failed');
CREATE TYPE "ProcessingLedgerStatus" AS ENUM ('processing', 'completed', 'retryable', 'dead_letter');

CREATE TABLE "ingestion_receipts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "client_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "provider_run_id" TEXT,
    "commit_sha" TEXT NOT NULL,
    "observed_ref" TEXT,
    "framework" TEXT NOT NULL,
    "status" "IngestionReceiptStatus" NOT NULL DEFAULT 'accepted',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ingestion_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'pending',
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "processing_ledgers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "consumer_version" TEXT NOT NULL,
    "status" "ProcessingLedgerStatus" NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processing_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dead_letters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "first_failed_at" TIMESTAMP(3) NOT NULL,
    "last_failed_at" TIMESTAMP(3) NOT NULL,
    "replayed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dead_letters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repos_tenant_id_id_key" ON "repos"("tenant_id", "id");
CREATE INDEX "repos_tenant_id_idx" ON "repos"("tenant_id");
CREATE INDEX "idempotency_keys_tenant_id_idx" ON "idempotency_keys"("tenant_id");
CREATE INDEX "idempotency_keys_tenant_id_client_key_idx" ON "idempotency_keys"("tenant_id", "client_key");
CREATE INDEX "idempotency_keys_request_hash_idx" ON "idempotency_keys"("request_hash");
CREATE INDEX "idempotency_keys_receipt_id_idx" ON "idempotency_keys"("receipt_id");

CREATE UNIQUE INDEX "ingestion_receipts_event_id_key" ON "ingestion_receipts"("event_id");
CREATE UNIQUE INDEX "ingestion_receipts_tenant_id_client_key_key" ON "ingestion_receipts"("tenant_id", "client_key");
CREATE INDEX "ingestion_receipts_tenant_id_created_at_idx" ON "ingestion_receipts"("tenant_id", "created_at" DESC);
CREATE INDEX "ingestion_receipts_repo_id_created_at_idx" ON "ingestion_receipts"("repo_id", "created_at" DESC);
CREATE INDEX "ingestion_receipts_status_created_at_idx" ON "ingestion_receipts"("status", "created_at" DESC);

CREATE UNIQUE INDEX "outbox_events_tenant_id_receipt_id_event_type_key" ON "outbox_events"("tenant_id", "receipt_id", "event_type");
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");
CREATE INDEX "outbox_events_tenant_id_created_at_idx" ON "outbox_events"("tenant_id", "created_at" DESC);

CREATE UNIQUE INDEX "processing_ledgers_receipt_id_consumer_consumer_version_key" ON "processing_ledgers"("receipt_id", "consumer", "consumer_version");
CREATE INDEX "processing_ledgers_tenant_id_status_next_attempt_at_idx" ON "processing_ledgers"("tenant_id", "status", "next_attempt_at");

CREATE UNIQUE INDEX "dead_letters_receipt_id_consumer_key" ON "dead_letters"("receipt_id", "consumer");
CREATE INDEX "dead_letters_tenant_id_created_at_idx" ON "dead_letters"("tenant_id", "created_at" DESC);

ALTER TABLE "repos" ADD CONSTRAINT "repos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ingestion_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ingestion_receipts" ADD CONSTRAINT "ingestion_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingestion_receipts" ADD CONSTRAINT "ingestion_receipts_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ingestion_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processing_ledgers" ADD CONSTRAINT "processing_ledgers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "processing_ledgers" ADD CONSTRAINT "processing_ledgers_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ingestion_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dead_letters" ADD CONSTRAINT "dead_letters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dead_letters" ADD CONSTRAINT "dead_letters_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "ingestion_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
