import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
  integer,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { campaignTemplates, platformEnum } from "./campaign-templates.js";
import { dataRows } from "./data-sources.js";
import { campaignSets } from "./campaign-sets.js";
import { adGroups } from "./ad-groups.js";

/**
 * Campaign Status Enum
 */
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "pending",
  "active",
  "paused",
  "completed",
  "error",
]);

/**
 * Sync Status Enum
 */
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
]);

/**
 * Generated Campaigns Table
 * Stores generated campaigns (local state before sync)
 */
export const generatedCampaigns = pgTable(
  "generated_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    // NOTE: This is nullable initially to support the data migration process.
    // After running:
    //   1. pnpm db:migrate-campaign-sets (to assign all campaigns to sets)
    //   2. 0002_make_campaign_set_id_required.sql migration
    // Update this to:
    //   .notNull().references(() => campaignSets.id, { onDelete: "cascade" })
    campaignSetId: uuid("campaign_set_id").references(() => campaignSets.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => campaignTemplates.id, { onDelete: "cascade" }),
    dataRowId: uuid("data_row_id")
      .notNull()
      .references(() => dataRows.id, { onDelete: "cascade" }),
    campaignData: jsonb("campaign_data")
      .$type<GeneratedCampaignData>()
      .notNull(),
    status: campaignStatusEnum("status").notNull().default("draft"),
    orderIndex: integer("order_index").notNull().default(0), // For ordering within a campaign set
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("generated_campaigns_template_idx").on(table.templateId),
    index("generated_campaigns_data_row_idx").on(table.dataRowId),
    index("generated_campaigns_status_idx").on(table.status),
    index("generated_campaigns_user_idx").on(table.userId),
    index("generated_campaigns_set_idx").on(table.campaignSetId),
    index("generated_campaigns_set_order_idx").on(
      table.campaignSetId,
      table.orderIndex
    ),
  ]
);

/**
 * Sync Records Table
 * Tracks platform sync status for generated campaigns
 */
export const syncRecords = pgTable(
  "sync_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    generatedCampaignId: uuid("generated_campaign_id")
      .notNull()
      .references(() => generatedCampaigns.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    platformId: varchar("platform_id", { length: 255 }), // ID from the ad platform
    syncStatus: syncStatusEnum("sync_status").notNull().default("pending"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    errorLog: text("error_log"),
    // Retry fields for error handling
    retryCount: integer("retry_count").notNull().default(0),
    lastRetryAt: timestamp("last_retry_at", { withTimezone: true }),
    permanentFailure: boolean("permanent_failure").notNull().default(false),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("sync_records_campaign_idx").on(table.generatedCampaignId),
    index("sync_records_platform_idx").on(table.platform),
    index("sync_records_status_idx").on(table.syncStatus),
    index("sync_records_platform_id_idx").on(table.platform, table.platformId),
    // Index for retry queries
    index("sync_records_retry_idx").on(
      table.syncStatus,
      table.permanentFailure,
      table.retryCount
    ),
    index("sync_records_next_retry_idx").on(table.nextRetryAt),
  ]
);

// Relations
export const generatedCampaignsRelations = relations(
  generatedCampaigns,
  ({ one, many }) => ({
    campaignSet: one(campaignSets, {
      fields: [generatedCampaigns.campaignSetId],
      references: [campaignSets.id],
    }),
    template: one(campaignTemplates, {
      fields: [generatedCampaigns.templateId],
      references: [campaignTemplates.id],
    }),
    dataRow: one(dataRows, {
      fields: [generatedCampaigns.dataRowId],
      references: [dataRows.id],
    }),
    syncRecords: many(syncRecords),
    adGroups: many(adGroups),
  })
);

export const syncRecordsRelations = relations(syncRecords, ({ one }) => ({
  generatedCampaign: one(generatedCampaigns, {
    fields: [syncRecords.generatedCampaignId],
    references: [generatedCampaigns.id],
  }),
}));

// Type definitions for JSONB columns
export interface GeneratedCampaignData {
  name: string;
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  adGroups?: Array<{
    name: string;
    settings?: Record<string, unknown>;
    ads?: Array<{
      headline?: string;
      description?: string;
      assets?: Record<string, unknown>;
    }>;
  }>;
  [key: string]: unknown;
}

// Type exports
export type GeneratedCampaign = typeof generatedCampaigns.$inferSelect;
export type NewGeneratedCampaign = typeof generatedCampaigns.$inferInsert;

export type SyncRecord = typeof syncRecords.$inferSelect;
export type NewSyncRecord = typeof syncRecords.$inferInsert;
