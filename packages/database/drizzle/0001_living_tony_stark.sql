CREATE TABLE "asset_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_backup_codes" text;--> statement-breakpoint
ALTER TABLE "creatives" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_folders" ADD CONSTRAINT "asset_folders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_folders" ADD CONSTRAINT "asset_folders_parent_id_asset_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."asset_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_folders_team_idx" ON "asset_folders" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "asset_folders_parent_idx" ON "asset_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "asset_folders_path_idx" ON "asset_folders" USING btree ("path" text_pattern_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "asset_folders_team_path_unique_idx" ON "asset_folders" USING btree ("team_id","path");--> statement-breakpoint
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_folder_id_asset_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."asset_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creatives_folder_idx" ON "creatives" USING btree ("folder_id");