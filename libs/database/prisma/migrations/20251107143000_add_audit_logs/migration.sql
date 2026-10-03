-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
    'login_success',
    'login_failure',
    'user_created',
    'role_assigned',
    'role_removed',
    'dsr_export_request',
    'dsr_export_download',
    'dsr_deletion_request',
    'config_updated',
    'token_created',
    'token_revoked',
    'other'
);

-- CreateEnum
CREATE TYPE "AuditSubject" AS ENUM (
    'user',
    'repo',
    'dsr',
    'configuration',
    'security',
    'session',
    'token',
    'system'
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "subject" "AuditSubject" NOT NULL,
    "subject_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_subject_subject_id_idx" ON "audit_logs"("subject", "subject_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

