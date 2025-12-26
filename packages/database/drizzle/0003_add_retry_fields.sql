-- Migration: Add Retry Fields to sync_records
-- This migration adds fields needed for error handling and retry logic
-- in the campaign sync system.

-- ============================================================================
-- ALTER sync_records TABLE
-- ============================================================================

-- Add retry_count to track number of retry attempts
-- Default is 0, indicating no retries have been attempted yet
ALTER TABLE "sync_records"
  ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Add last_retry_at to track when the last retry was attempted
-- Used to calculate backoff delays
ALTER TABLE "sync_records"
  ADD COLUMN "last_retry_at" timestamp with time zone;--> statement-breakpoint

-- Add permanent_failure flag to mark campaigns that should not be retried
-- After max retries are exhausted, this is set to true
ALTER TABLE "sync_records"
  ADD COLUMN "permanent_failure" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Add next_retry_at to enable efficient querying for retry jobs
-- Pre-calculated based on exponential backoff
ALTER TABLE "sync_records"
  ADD COLUMN "next_retry_at" timestamp with time zone;--> statement-breakpoint

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding failed syncs that need retry
-- Used by the retry job to efficiently query retryable records
CREATE INDEX "sync_records_retry_idx" ON "sync_records" USING btree (
  "sync_status",
  "permanent_failure",
  "retry_count"
) WHERE "sync_status" = 'failed' AND "permanent_failure" = false;--> statement-breakpoint

-- Index for finding records ready for next retry
CREATE INDEX "sync_records_next_retry_idx" ON "sync_records" USING btree ("next_retry_at")
WHERE "next_retry_at" IS NOT NULL AND "permanent_failure" = false;
