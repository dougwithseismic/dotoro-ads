CREATE TYPE "public"."team_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"token" varchar(64) NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'viewer' NOT NULL,
	"invited_by" uuid,
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
ALTER TABLE "ad_accounts" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "campaign_templates" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "transforms" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_token_idx" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "team_invitations_team_email_idx" ON "team_invitations" USING btree ("team_id","email");--> statement-breakpoint
CREATE INDEX "team_invitations_expires_idx" ON "team_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_user_idx" ON "team_memberships" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_user_idx" ON "team_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_role_idx" ON "team_memberships" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_idx" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "teams_plan_idx" ON "teams" USING btree ("plan");--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sets" ADD CONSTRAINT "campaign_sets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_templates" ADD CONSTRAINT "campaign_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_campaigns" ADD CONSTRAINT "generated_campaigns_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transforms" ADD CONSTRAINT "transforms_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_accounts_team_idx" ON "ad_accounts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "campaign_sets_team_idx" ON "campaign_sets" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "campaign_templates_team_idx" ON "campaign_templates" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "creatives_team_idx" ON "creatives" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "data_sources_team_idx" ON "data_sources" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "generated_campaigns_team_idx" ON "generated_campaigns" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "rules_team_idx" ON "rules" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "transforms_team_idx" ON "transforms" USING btree ("team_id");