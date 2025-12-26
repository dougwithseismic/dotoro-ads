-- Migration: Add Campaign Sets and Normalize Ad Groups/Ads/Keywords
-- This migration creates the campaign_sets table and supporting tables for
-- a normalized campaign hierarchy structure.

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Campaign Set Status Enum
DO $$ BEGIN
  CREATE TYPE "public"."campaign_set_status" AS ENUM(
    'draft',
    'pending',
    'syncing',
    'active',
    'paused',
    'completed',
    'archived',
    'error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Campaign Set Sync Status Enum
DO $$ BEGIN
  CREATE TYPE "public"."campaign_set_sync_status" AS ENUM(
    'pending',
    'syncing',
    'synced',
    'failed',
    'conflict'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Ad Group Status Enum
DO $$ BEGIN
  CREATE TYPE "public"."ad_group_status" AS ENUM(
    'active',
    'paused',
    'removed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Ad Status Enum
DO $$ BEGIN
  CREATE TYPE "public"."ad_status" AS ENUM(
    'active',
    'paused',
    'removed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Keyword Match Type Enum
DO $$ BEGIN
  CREATE TYPE "public"."keyword_match_type" AS ENUM(
    'broad',
    'phrase',
    'exact'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Keyword Status Enum
DO $$ BEGIN
  CREATE TYPE "public"."keyword_status" AS ENUM(
    'active',
    'paused',
    'removed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ============================================================================
-- TABLES
-- ============================================================================

-- Campaign Sets Table
-- A campaign set is a collection of campaigns created from the wizard.
CREATE TABLE "campaign_sets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "name" varchar(255) NOT NULL,
  "description" text,
  "data_source_id" uuid REFERENCES "data_sources"("id") ON DELETE SET NULL,
  "template_id" uuid REFERENCES "campaign_templates"("id") ON DELETE SET NULL,
  "config" jsonb,
  "status" "campaign_set_status" DEFAULT 'draft' NOT NULL,
  "sync_status" "campaign_set_sync_status" DEFAULT 'pending' NOT NULL,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Ad Groups Table
-- Normalized from JSONB - stores ad groups within campaigns
CREATE TABLE "ad_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "generated_campaigns"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "settings" jsonb,
  "platform_ad_group_id" varchar(255),
  "status" "ad_group_status" DEFAULT 'active' NOT NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Ads Table
-- Stores individual ads within ad groups
CREATE TABLE "ads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ad_group_id" uuid NOT NULL REFERENCES "ad_groups"("id") ON DELETE CASCADE,
  "headline" varchar(300),
  "description" text,
  "display_url" varchar(255),
  "final_url" text,
  "call_to_action" varchar(50),
  "assets" jsonb,
  "platform_ad_id" varchar(255),
  "status" "ad_status" DEFAULT 'active' NOT NULL,
  "order_index" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Keywords Table
-- Stores keywords for ad groups (primarily for search campaigns)
CREATE TABLE "keywords" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ad_group_id" uuid NOT NULL REFERENCES "ad_groups"("id") ON DELETE CASCADE,
  "keyword" varchar(255) NOT NULL,
  "match_type" "keyword_match_type" DEFAULT 'broad' NOT NULL,
  "bid" numeric(10, 2),
  "platform_keyword_id" varchar(255),
  "status" "keyword_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- ============================================================================
-- ALTER EXISTING TABLES
-- ============================================================================

-- Add campaign_set_id to generated_campaigns (nullable initially for migration)
ALTER TABLE "generated_campaigns"
  ADD COLUMN "campaign_set_id" uuid REFERENCES "campaign_sets"("id") ON DELETE SET NULL;--> statement-breakpoint

-- Add order_index to generated_campaigns for ordering within a set
ALTER TABLE "generated_campaigns"
  ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Campaign Sets Indexes
CREATE INDEX "campaign_sets_user_idx" ON "campaign_sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_status_idx" ON "campaign_sets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_sets_sync_status_idx" ON "campaign_sets" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "campaign_sets_data_source_idx" ON "campaign_sets" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_template_idx" ON "campaign_sets" USING btree ("template_id");--> statement-breakpoint

-- Ad Groups Indexes
CREATE INDEX "ad_groups_campaign_idx" ON "ad_groups" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_groups_status_idx" ON "ad_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_groups_platform_id_idx" ON "ad_groups" USING btree ("platform_ad_group_id");--> statement-breakpoint
CREATE INDEX "ad_groups_order_idx" ON "ad_groups" USING btree ("campaign_id", "order_index");--> statement-breakpoint

-- Ads Indexes
CREATE INDEX "ads_ad_group_idx" ON "ads" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "ads_status_idx" ON "ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ads_platform_id_idx" ON "ads" USING btree ("platform_ad_id");--> statement-breakpoint
CREATE INDEX "ads_order_idx" ON "ads" USING btree ("ad_group_id", "order_index");--> statement-breakpoint

-- Keywords Indexes
CREATE INDEX "keywords_ad_group_idx" ON "keywords" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "keywords_status_idx" ON "keywords" USING btree ("status");--> statement-breakpoint
CREATE INDEX "keywords_match_type_idx" ON "keywords" USING btree ("match_type");--> statement-breakpoint
CREATE INDEX "keywords_platform_id_idx" ON "keywords" USING btree ("platform_keyword_id");--> statement-breakpoint
CREATE INDEX "keywords_keyword_idx" ON "keywords" USING btree ("ad_group_id", "keyword");--> statement-breakpoint

-- Generated Campaigns new indexes
CREATE INDEX "generated_campaigns_set_idx" ON "generated_campaigns" USING btree ("campaign_set_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_set_order_idx" ON "generated_campaigns" USING btree ("campaign_set_id", "order_index");
