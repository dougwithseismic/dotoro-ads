ALTER TABLE "sync_records" ALTER COLUMN "platform" SET DATA TYPE platform;--> statement-breakpoint
ALTER TABLE "template_rules" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "template_rules" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;