CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'error', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."ad_group_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."ad_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."campaign_set_status" AS ENUM('draft', 'pending', 'syncing', 'active', 'paused', 'completed', 'archived', 'error');--> statement-breakpoint
CREATE TYPE "public"."campaign_set_sync_status" AS ENUM('pending', 'syncing', 'synced', 'failed', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('reddit', 'google', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."creative_status" AS ENUM('PENDING', 'UPLOADED', 'PROCESSING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."creative_type" AS ENUM('IMAGE', 'VIDEO', 'CAROUSEL');--> statement-breakpoint
CREATE TYPE "public"."data_source_type" AS ENUM('csv', 'api', 'manual', 'google-sheets');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'pending', 'active', 'paused', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'syncing', 'synced', 'failed', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."keyword_match_type" AS ENUM('broad', 'phrase', 'exact');--> statement-breakpoint
CREATE TYPE "public"."keyword_status" AS ENUM('active', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('filter', 'transform', 'conditional');--> statement-breakpoint
CREATE TYPE "public"."team_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "ad_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"platform" varchar(50) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"credentials" text,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_account_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scopes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
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
CREATE TABLE "ad_group_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_template_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_group_template_id" uuid NOT NULL,
	"headline" text,
	"description" text,
	"variables" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"name" varchar(255) NOT NULL,
	"platform" "platform" NOT NULL,
	"structure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creative_id" uuid NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_template_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"slot_name" varchar(100) NOT NULL,
	"creative_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"account_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "creative_type" NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"dimensions" jsonb,
	"storage_key" varchar(512) NOT NULL,
	"cdn_url" text,
	"thumbnail_key" varchar(512),
	"status" "creative_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "column_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid NOT NULL,
	"source_column" varchar(255) NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid NOT NULL,
	"row_data" jsonb NOT NULL,
	"row_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" "data_source_type" NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"campaign_set_id" uuid,
	"template_id" uuid,
	"data_row_id" uuid,
	"campaign_data" jsonb NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generated_campaign_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"platform_id" varchar(255),
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"error_log" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp with time zone,
	"permanent_failure" boolean DEFAULT false NOT NULL,
	"next_retry_at" timestamp with time zone,
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
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" "rule_type" NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"token" varchar(64) NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" text,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"avatar_url" text,
	"settings" jsonb,
	"billing_email" varchar(255),
	"plan" "team_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "template_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"execution_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
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
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_ad_account_id_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."ad_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaign_id_generated_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."generated_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD CONSTRAINT "campaign_sets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD CONSTRAINT "campaign_sets_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD CONSTRAINT "campaign_sets_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_group_templates" ADD CONSTRAINT "ad_group_templates_campaign_template_id_campaign_templates_id_fk" FOREIGN KEY ("campaign_template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_templates" ADD CONSTRAINT "ad_templates_ad_group_template_id_ad_group_templates_id_fk" FOREIGN KEY ("ad_group_template_id") REFERENCES "public"."ad_group_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_templates" ADD CONSTRAINT "campaign_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_tags" ADD CONSTRAINT "creative_tags_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_template_links" ADD CONSTRAINT "creative_template_links_creative_id_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "column_mappings" ADD CONSTRAINT "column_mappings_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_rows" ADD CONSTRAINT "data_rows_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_campaign_set_id_campaign_sets_id_fk" FOREIGN KEY ("campaign_set_id") REFERENCES "public"."campaign_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_data_row_id_data_rows_id_fk" FOREIGN KEY ("data_row_id") REFERENCES "public"."data_rows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_records" ADD CONSTRAINT "sync_records_generated_campaign_id_generated_campaigns_id_fk" FOREIGN KEY ("generated_campaign_id") REFERENCES "public"."generated_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_rules" ADD CONSTRAINT "template_rules_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_rules" ADD CONSTRAINT "template_rules_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transforms" ADD CONSTRAINT "transforms_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transforms" ADD CONSTRAINT "transforms_source_data_source_id_data_sources_id_fk" FOREIGN KEY ("source_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transforms" ADD CONSTRAINT "transforms_output_data_source_id_data_sources_id_fk" FOREIGN KEY ("output_data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_accounts_platform_idx" ON "ad_accounts" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "ad_accounts_status_idx" ON "ad_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_accounts_platform_account_idx" ON "ad_accounts" USING btree ("platform","account_id");--> statement-breakpoint
CREATE INDEX "ad_accounts_user_idx" ON "ad_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ad_accounts_team_idx" ON "ad_accounts" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_accounts_platform_account_unique_idx" ON "ad_accounts" USING btree ("platform","account_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_account_idx" ON "oauth_tokens" USING btree ("ad_account_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_expires_idx" ON "oauth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tokens_account_unique_idx" ON "oauth_tokens" USING btree ("ad_account_id");--> statement-breakpoint
CREATE INDEX "ad_groups_campaign_idx" ON "ad_groups" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_groups_status_idx" ON "ad_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_groups_platform_id_idx" ON "ad_groups" USING btree ("platform_ad_group_id");--> statement-breakpoint
CREATE INDEX "ad_groups_order_idx" ON "ad_groups" USING btree ("campaign_id","order_index");--> statement-breakpoint
CREATE INDEX "ads_ad_group_idx" ON "ads" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "ads_status_idx" ON "ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ads_platform_id_idx" ON "ads" USING btree ("platform_ad_id");--> statement-breakpoint
CREATE INDEX "ads_order_idx" ON "ads" USING btree ("ad_group_id","order_index");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "campaign_sets_user_idx" ON "campaign_sets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_team_idx" ON "campaign_sets" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_status_idx" ON "campaign_sets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_sets_sync_status_idx" ON "campaign_sets" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "campaign_sets_data_source_idx" ON "campaign_sets" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_template_idx" ON "campaign_sets" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "ad_group_templates_campaign_idx" ON "ad_group_templates" USING btree ("campaign_template_id");--> statement-breakpoint
CREATE INDEX "ad_templates_ad_group_idx" ON "ad_templates" USING btree ("ad_group_template_id");--> statement-breakpoint
CREATE INDEX "campaign_templates_platform_idx" ON "campaign_templates" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "campaign_templates_user_idx" ON "campaign_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_templates_team_idx" ON "campaign_templates" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "creative_tags_creative_idx" ON "creative_tags" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX "creative_tags_tag_idx" ON "creative_tags" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "creative_tags_creative_tag_unique_idx" ON "creative_tags" USING btree ("creative_id","tag");--> statement-breakpoint
CREATE INDEX "creative_template_links_template_idx" ON "creative_template_links" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "creative_template_links_slot_idx" ON "creative_template_links" USING btree ("slot_name");--> statement-breakpoint
CREATE INDEX "creative_template_links_creative_idx" ON "creative_template_links" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX "creative_template_links_template_slot_idx" ON "creative_template_links" USING btree ("template_id","slot_name");--> statement-breakpoint
CREATE INDEX "creative_template_links_priority_idx" ON "creative_template_links" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "creatives_team_idx" ON "creatives" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "creatives_account_idx" ON "creatives" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "creatives_type_idx" ON "creatives" USING btree ("type");--> statement-breakpoint
CREATE INDEX "creatives_status_idx" ON "creatives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "creatives_account_type_idx" ON "creatives" USING btree ("account_id","type");--> statement-breakpoint
CREATE INDEX "creatives_created_at_idx" ON "creatives" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "creatives_storage_key_idx" ON "creatives" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "column_mappings_source_idx" ON "column_mappings" USING btree ("data_source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "column_mappings_source_column_unique_idx" ON "column_mappings" USING btree ("data_source_id","source_column");--> statement-breakpoint
CREATE INDEX "data_rows_source_idx" ON "data_rows" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "data_rows_source_index_idx" ON "data_rows" USING btree ("data_source_id","row_index");--> statement-breakpoint
CREATE INDEX "data_sources_type_idx" ON "data_sources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "data_sources_user_idx" ON "data_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_sources_team_idx" ON "data_sources" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_template_idx" ON "generated_campaigns" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_data_row_idx" ON "generated_campaigns" USING btree ("data_row_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_status_idx" ON "generated_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_campaigns_user_idx" ON "generated_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_team_idx" ON "generated_campaigns" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_set_idx" ON "generated_campaigns" USING btree ("campaign_set_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_set_order_idx" ON "generated_campaigns" USING btree ("campaign_set_id","order_index");--> statement-breakpoint
CREATE INDEX "sync_records_campaign_idx" ON "sync_records" USING btree ("generated_campaign_id");--> statement-breakpoint
CREATE INDEX "sync_records_platform_idx" ON "sync_records" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "sync_records_status_idx" ON "sync_records" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "sync_records_platform_id_idx" ON "sync_records" USING btree ("platform","platform_id");--> statement-breakpoint
CREATE INDEX "sync_records_retry_idx" ON "sync_records" USING btree ("sync_status","permanent_failure","retry_count");--> statement-breakpoint
CREATE INDEX "sync_records_next_retry_idx" ON "sync_records" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "keywords_ad_group_idx" ON "keywords" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "keywords_status_idx" ON "keywords" USING btree ("status");--> statement-breakpoint
CREATE INDEX "keywords_match_type_idx" ON "keywords" USING btree ("match_type");--> statement-breakpoint
CREATE INDEX "keywords_platform_id_idx" ON "keywords" USING btree ("platform_keyword_id");--> statement-breakpoint
CREATE INDEX "keywords_keyword_idx" ON "keywords" USING btree ("ad_group_id","keyword");--> statement-breakpoint
CREATE INDEX "rules_type_idx" ON "rules" USING btree ("type");--> statement-breakpoint
CREATE INDEX "rules_enabled_priority_idx" ON "rules" USING btree ("enabled","priority");--> statement-breakpoint
CREATE INDEX "rules_user_idx" ON "rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rules_team_idx" ON "rules" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_token_idx" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "team_invitations_team_email_idx" ON "team_invitations" USING btree ("team_id","email");--> statement-breakpoint
CREATE INDEX "team_invitations_expires_idx" ON "team_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_user_idx" ON "team_memberships" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_user_idx" ON "team_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_role_idx" ON "team_memberships" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_idx" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "teams_plan_idx" ON "teams" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "template_rules_template_idx" ON "template_rules" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_rules_rule_idx" ON "template_rules" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "template_rules_execution_idx" ON "template_rules" USING btree ("template_id","execution_order");--> statement-breakpoint
CREATE UNIQUE INDEX "template_rules_template_rule_unique_idx" ON "template_rules" USING btree ("template_id","rule_id");--> statement-breakpoint
CREATE INDEX "transforms_source_idx" ON "transforms" USING btree ("source_data_source_id");--> statement-breakpoint
CREATE INDEX "transforms_output_idx" ON "transforms" USING btree ("output_data_source_id");--> statement-breakpoint
CREATE INDEX "transforms_enabled_idx" ON "transforms" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "transforms_user_idx" ON "transforms" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transforms_team_idx" ON "transforms" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_oauth_tokens_user_provider_idx" ON "user_oauth_tokens" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "user_oauth_tokens_provider_idx" ON "user_oauth_tokens" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "user_oauth_tokens_expires_idx" ON "user_oauth_tokens" USING btree ("expires_at");