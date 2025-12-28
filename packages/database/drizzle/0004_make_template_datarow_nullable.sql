-- Migration: Make template_id and data_row_id nullable in generated_campaigns
-- This migration allows campaigns to be generated directly from campaign set config
-- without requiring template or data row FK references.

-- ============================================================================
-- ALTER generated_campaigns TABLE
-- ============================================================================

-- Make template_id nullable
-- Campaigns generated from campaign sets don't require a template
ALTER TABLE "generated_campaigns"
  ALTER COLUMN "template_id" DROP NOT NULL;--> statement-breakpoint

-- Make data_row_id nullable
-- Campaigns can be generated from in-memory data without persisted data rows
ALTER TABLE "generated_campaigns"
  ALTER COLUMN "data_row_id" DROP NOT NULL;--> statement-breakpoint

-- ============================================================================
-- Update foreign key constraints to allow null values
-- ============================================================================

-- Drop existing foreign key constraints
ALTER TABLE "generated_campaigns"
  DROP CONSTRAINT IF EXISTS "generated_campaigns_template_id_campaign_templates_id_fk";--> statement-breakpoint

ALTER TABLE "generated_campaigns"
  DROP CONSTRAINT IF EXISTS "generated_campaigns_data_row_id_data_rows_id_fk";--> statement-breakpoint

-- Re-add foreign key constraints that allow null values
-- ON DELETE SET NULL is appropriate since the columns are now nullable
ALTER TABLE "generated_campaigns"
  ADD CONSTRAINT "generated_campaigns_template_id_campaign_templates_id_fk"
  FOREIGN KEY ("template_id")
  REFERENCES "campaign_templates"("id")
  ON DELETE SET NULL;--> statement-breakpoint

ALTER TABLE "generated_campaigns"
  ADD CONSTRAINT "generated_campaigns_data_row_id_data_rows_id_fk"
  FOREIGN KEY ("data_row_id")
  REFERENCES "data_rows"("id")
  ON DELETE SET NULL;
