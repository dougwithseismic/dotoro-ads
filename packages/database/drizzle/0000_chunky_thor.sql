CREATE TABLE "ad_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"credentials" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
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
CREATE TABLE "ad_group_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_template_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"settings" jsonb
);
--> statement-breakpoint
CREATE TABLE "ad_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_group_template_id" uuid NOT NULL,
	"headline" text,
	"description" text,
	"variables" jsonb
);
--> statement-breakpoint
CREATE TABLE "campaign_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"platform" varchar(50) NOT NULL,
	"structure" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "column_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data_source_id" uuid NOT NULL,
	"source_column" varchar(255) NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"data_type" varchar(50) NOT NULL
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
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"data_row_id" uuid NOT NULL,
	"campaign_data" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generated_campaign_id" uuid NOT NULL,
	"platform" varchar(50) NOT NULL,
	"platform_id" varchar(255),
	"sync_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"error_log" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"execution_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_ad_account_id_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."ad_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_group_templates" ADD CONSTRAINT "ad_group_templates_campaign_template_id_campaign_templates_id_fk" FOREIGN KEY ("campaign_template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_templates" ADD CONSTRAINT "ad_templates_ad_group_template_id_ad_group_templates_id_fk" FOREIGN KEY ("ad_group_template_id") REFERENCES "public"."ad_group_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "column_mappings" ADD CONSTRAINT "column_mappings_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_rows" ADD CONSTRAINT "data_rows_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_data_row_id_data_rows_id_fk" FOREIGN KEY ("data_row_id") REFERENCES "public"."data_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_records" ADD CONSTRAINT "sync_records_generated_campaign_id_generated_campaigns_id_fk" FOREIGN KEY ("generated_campaign_id") REFERENCES "public"."generated_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_rules" ADD CONSTRAINT "template_rules_template_id_campaign_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."campaign_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_rules" ADD CONSTRAINT "template_rules_rule_id_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_accounts_platform_idx" ON "ad_accounts" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "ad_accounts_status_idx" ON "ad_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ad_accounts_platform_account_idx" ON "ad_accounts" USING btree ("platform","account_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_account_idx" ON "oauth_tokens" USING btree ("ad_account_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_expires_idx" ON "oauth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ad_group_templates_campaign_idx" ON "ad_group_templates" USING btree ("campaign_template_id");--> statement-breakpoint
CREATE INDEX "ad_templates_ad_group_idx" ON "ad_templates" USING btree ("ad_group_template_id");--> statement-breakpoint
CREATE INDEX "campaign_templates_platform_idx" ON "campaign_templates" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "column_mappings_source_idx" ON "column_mappings" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "data_rows_source_idx" ON "data_rows" USING btree ("data_source_id");--> statement-breakpoint
CREATE INDEX "data_rows_source_index_idx" ON "data_rows" USING btree ("data_source_id","row_index");--> statement-breakpoint
CREATE INDEX "data_sources_type_idx" ON "data_sources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "generated_campaigns_template_idx" ON "generated_campaigns" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_data_row_idx" ON "generated_campaigns" USING btree ("data_row_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_status_idx" ON "generated_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_records_campaign_idx" ON "sync_records" USING btree ("generated_campaign_id");--> statement-breakpoint
CREATE INDEX "sync_records_platform_idx" ON "sync_records" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "sync_records_status_idx" ON "sync_records" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "sync_records_platform_id_idx" ON "sync_records" USING btree ("platform","platform_id");--> statement-breakpoint
CREATE INDEX "rules_type_idx" ON "rules" USING btree ("type");--> statement-breakpoint
CREATE INDEX "rules_enabled_priority_idx" ON "rules" USING btree ("enabled","priority");--> statement-breakpoint
CREATE INDEX "template_rules_template_idx" ON "template_rules" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_rules_rule_idx" ON "template_rules" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "template_rules_execution_idx" ON "template_rules" USING btree ("template_id","execution_order");