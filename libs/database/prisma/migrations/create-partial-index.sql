-- Partial index for highly flaky tests (score >= 60)
-- This improves query performance for filtering highly flaky tests
-- Created as a separate migration since Prisma doesn't support partial indexes directly

CREATE INDEX IF NOT EXISTS idx_flake_scores_highly_flaky 
ON flake_scores(score) 
WHERE score >= 60;

COMMENT ON INDEX idx_flake_scores_highly_flaky IS 
'Partial index for efficiently querying highly flaky tests (score >= 60)';
