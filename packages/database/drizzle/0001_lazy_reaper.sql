CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'error', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('reddit', 'google', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."data_source_type" AS ENUM('csv', 'api', 'manual');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pending', 'active', 'paused', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'syncing', 'synced', 'failed', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('filter', 'transform', 'conditional');--> statement-breakpoint
ALTER TABLE "ad_accounts" ALTER COLUMN "status" SET DATA TYPE account_status;--> statement-breakpoint
ALTER TABLE "campaign_templates" ALTER COLUMN "platform" SET DATA TYPE platform;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "type" SET DATA TYPE data_source_type;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ALTER COLUMN "status" SET DATA TYPE campaign_status;--> statement-breakpoint
ALTER TABLE "sync_records" ALTER COLUMN "sync_status" SET DATA TYPE sync_status;--> statement-breakpoint
ALTER TABLE "rules" ALTER COLUMN "type" SET DATA TYPE rule_type;--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "ad_group_templates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_group_templates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_templates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_templates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_templates" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "column_mappings" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "column_mappings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "ad_accounts_user_idx" ON "ad_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_accounts_platform_account_unique_idx" ON "ad_accounts" USING btree ("platform","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tokens_account_unique_idx" ON "oauth_tokens" USING btree ("ad_account_id");--> statement-breakpoint
CREATE INDEX "campaign_templates_user_idx" ON "campaign_templates" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "column_mappings_source_column_unique_idx" ON "column_mappings" USING btree ("data_source_id","source_column");--> statement-breakpoint
CREATE INDEX "data_sources_user_idx" ON "data_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_user_idx" ON "generated_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rules_user_idx" ON "rules" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "template_rules_template_rule_unique_idx" ON "template_rules" USING btree ("template_id","rule_id");