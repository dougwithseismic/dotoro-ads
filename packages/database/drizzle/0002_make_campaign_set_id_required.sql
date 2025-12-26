-- Migration: Make campaign_set_id Required
--
-- IMPORTANT: Run this AFTER the data migration script has completed.
-- The data migration script (pnpm db:migrate-campaign-sets) must be run first
-- to ensure all existing campaigns have been assigned to campaign sets.
--
-- This migration will fail if any campaigns still have NULL campaign_set_id.
-- If this happens:
-- 1. Run: pnpm db:migrate-campaign-sets
-- 2. Verify all campaigns have campaign_set_id set
-- 3. Then run this migration

-- Make campaign_set_id NOT NULL
ALTER TABLE "generated_campaigns"
  ALTER COLUMN "campaign_set_id" SET NOT NULL;--> statement-breakpoint

-- Update the foreign key constraint to CASCADE on delete
-- First drop the existing constraint, then add with CASCADE
ALTER TABLE "generated_campaigns"
  DROP CONSTRAINT IF EXISTS "generated_campaigns_campaign_set_id_campaign_sets_id_fk";--> statement-breakpoint

ALTER TABLE "generated_campaigns"
  ADD CONSTRAINT "generated_campaigns_campaign_set_id_campaign_sets_id_fk"
  FOREIGN KEY ("campaign_set_id")
  REFERENCES "campaign_sets"("id")
  ON DELETE CASCADE;
