-- CreateEnum
CREATE TYPE "DataSubjectRequestType" AS ENUM ('export', 'deletion');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "confirmation_sent_at" TIMESTAMP(3),
    "export_data" JSONB,
    "metadata" JSONB,

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_subject_request_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_subject_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_subject_requests_user_id_requested_at_idx" ON "data_subject_requests"("user_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "data_subject_request_events_request_id_created_at_idx" ON "data_subject_request_events"("request_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_request_events" ADD CONSTRAINT "data_subject_request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "data_subject_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

