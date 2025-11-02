-- CreateEnum
CREATE TYPE "RepoVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('pass', 'fail', 'skip');

-- CreateEnum
CREATE TYPE "OwnerSource" AS ENUM ('CODEOWNERS', 'manual', 'heuristic');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('flake_detected', 'score_threshold_breach', 'system_alert', 'ci_integration', 'other');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateTable
CREATE TABLE "repos" (
    "id" TEXT NOT NULL,
    "gh_id" BIGINT,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "visibility" "RepoVisibility" NOT NULL DEFAULT 'public',
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "github_id" TEXT,
    "github_login" TEXT,
    "email" TEXT,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "telemetry_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "framework" TEXT NOT NULL DEFAULT 'unknown',
    "tags" TEXT[],
    "description" TEXT,
    "last_failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "rerun_count" INTEGER NOT NULL DEFAULT 0,
    "failure_details" TEXT,
    "environment_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flake_scores" (
    "id" TEXT NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "window_n" INTEGER NOT NULL DEFAULT 50,
    "pass_rate" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "recency_fail" DOUBLE PRECISION NOT NULL,
    "clustering" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "class" TEXT NOT NULL DEFAULT 'stable',
    "ml_prediction_data" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "repoId" TEXT,

    CONSTRAINT "flake_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_maps" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "source" "OwnerSource" NOT NULL DEFAULT 'manual',
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB,
    "event_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_configs" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "retention_days" INTEGER DEFAULT 30,
    "scoring_threshold" INTEGER DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repos_gh_id_key" ON "repos"("gh_id");

-- CreateIndex
CREATE INDEX "repos_gh_id_idx" ON "repos"("gh_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "users_github_id_idx" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "test_cases_repo_id_idx" ON "test_cases"("repo_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_cases_repo_id_path_name_framework_key" ON "test_cases"("repo_id", "path", "name", "framework");

-- CreateIndex
CREATE INDEX "test_runs_repo_id_started_at_idx" ON "test_runs"("repo_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "test_runs_test_case_id_started_at_idx" ON "test_runs"("test_case_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "test_runs_environment_hash_idx" ON "test_runs"("environment_hash");

-- CreateIndex
CREATE INDEX "test_runs_commit_sha_idx" ON "test_runs"("commit_sha");

-- CreateIndex
CREATE UNIQUE INDEX "flake_scores_test_case_id_key" ON "flake_scores"("test_case_id");

-- CreateIndex
CREATE INDEX "flake_scores_score_idx" ON "flake_scores"("score");

-- CreateIndex
CREATE INDEX "owner_maps_repo_id_pattern_idx" ON "owner_maps"("repo_id", "pattern");

-- CreateIndex
CREATE INDEX "telemetry_events_event_type_event_timestamp_idx" ON "telemetry_events"("event_type", "event_timestamp" DESC);

-- CreateIndex
CREATE INDEX "telemetry_events_repo_id_idx" ON "telemetry_events"("repo_id");

-- CreateIndex
CREATE INDEX "telemetry_events_user_id_idx" ON "telemetry_events"("user_id");

-- CreateIndex
CREATE INDEX "telemetry_events_event_timestamp_idx" ON "telemetry_events"("event_timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "repository_configs_repo_id_key" ON "repository_configs"("repo_id");

-- CreateIndex
CREATE INDEX "notifications_repo_id_created_at_idx" ON "notifications"("repo_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_read_created_at_idx" ON "notifications"("read", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flake_scores" ADD CONSTRAINT "flake_scores_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flake_scores" ADD CONSTRAINT "flake_scores_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_maps" ADD CONSTRAINT "owner_maps_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_configs" ADD CONSTRAINT "repository_configs_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
