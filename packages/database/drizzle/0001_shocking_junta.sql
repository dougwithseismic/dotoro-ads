CREATE TYPE "public"."ad_group_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."ad_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."campaign_set_status" AS ENUM('draft', 'pending', 'syncing', 'active', 'paused', 'completed', 'archived', 'error');--> statement-breakpoint
CREATE TYPE "public"."campaign_set_sync_status" AS ENUM('pending', 'syncing', 'synced', 'failed', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."keyword_match_type" AS ENUM('broad', 'phrase', 'exact');--> statement-breakpoint
CREATE TYPE "public"."keyword_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
ALTER TYPE "public"."data_source_type" ADD VALUE 'google-sheets';--> statement-breakpoint
CREATE TABLE "ad_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"settings" jsonb,
	"platform_ad_group_id" varchar(255),
	"status" "ad_group_status" DEFAULT 'active' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_group_id" uuid NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "campaign_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"data_source_id" uuid,
	"template_id" uuid,
	"config" jsonb,
	"status" "campaign_set_status" DEFAULT 'draft' NOT NULL,
	"sync_status" "campaign_set_sync_status" DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_group_id" uuid NOT NULL,
	"keyword" varchar(255) NOT NULL,
	"match_type" "keyword_match_type" DEFAULT 'broad' NOT NULL,
	"bid" numeric(10, 2),
	"platform_keyword_id" varchar(255),
	"status" "keyword_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"source_data_source_id" uuid NOT NULL,
	"output_data_source_id" uuid NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scopes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD COLUMN "campaign_set_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_records" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_records" ADD COLUMN "last_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_records" ADD COLUMN "permanent_failure" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_records" ADD COLUMN "next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaign_id_generated_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."generated_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD CONSTRAINT "campaign_sets_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD CONSTRAINT "campaign_sets_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transforms" ADD CONSTRAINT "transforms_source_data_source_id_data_sources_id_fk" FOREIGN KEY ("source_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transforms" ADD CONSTRAINT "transforms_output_data_source_id_data_sources_id_fk" FOREIGN KEY ("output_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_groups_campaign_idx" ON "ad_groups" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_groups_status_idx" ON "ad_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_groups_platform_id_idx" ON "ad_groups" USING btree ("platform_ad_group_id");--> statement-breakpoint
CREATE INDEX "ad_groups_order_idx" ON "ad_groups" USING btree ("campaign_id","order_index");--> statement-breakpoint
CREATE INDEX "ads_ad_group_idx" ON "ads" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "ads_status_idx" ON "ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ads_platform_id_idx" ON "ads" USING btree ("platform_ad_id");--> statement-breakpoint
CREATE INDEX "ads_order_idx" ON "ads" USING btree ("ad_group_id","order_index");--> statement-breakpoint
CREATE INDEX "campaign_sets_user_idx" ON "campaign_sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_status_idx" ON "campaign_sets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_sets_sync_status_idx" ON "campaign_sets" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "campaign_sets_data_source_idx" ON "campaign_sets" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_template_idx" ON "campaign_sets" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "keywords_ad_group_idx" ON "keywords" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "keywords_status_idx" ON "keywords" USING btree ("status");--> statement-breakpoint
CREATE INDEX "keywords_match_type_idx" ON "keywords" USING btree ("match_type");--> statement-breakpoint
CREATE INDEX "keywords_platform_id_idx" ON "keywords" USING btree ("platform_keyword_id");--> statement-breakpoint
CREATE INDEX "keywords_keyword_idx" ON "keywords" USING btree ("ad_group_id","keyword");--> statement-breakpoint
CREATE INDEX "transforms_source_idx" ON "transforms" USING btree ("source_data_source_id");--> statement-breakpoint
CREATE INDEX "transforms_output_idx" ON "transforms" USING btree ("output_data_source_id");--> statement-breakpoint
CREATE INDEX "transforms_enabled_idx" ON "transforms" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "transforms_user_idx" ON "transforms" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_oauth_tokens_user_provider_idx" ON "user_oauth_tokens" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "user_oauth_tokens_provider_idx" ON "user_oauth_tokens" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "user_oauth_tokens_expires_idx" ON "user_oauth_tokens" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_campaign_set_id_campaign_sets_id_fk" FOREIGN KEY ("campaign_set_id") REFERENCES "public"."campaign_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_campaigns_set_idx" ON "generated_campaigns" USING btree ("campaign_set_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_set_order_idx" ON "generated_campaigns" USING btree ("campaign_set_id","order_index");--> statement-breakpoint
CREATE INDEX "sync_records_retry_idx" ON "sync_records" USING btree ("sync_status","permanent_failure","retry_count");--> statement-breakpoint
CREATE INDEX "sync_records_next_retry_idx" ON "sync_records" USING btree ("next_retry_at");