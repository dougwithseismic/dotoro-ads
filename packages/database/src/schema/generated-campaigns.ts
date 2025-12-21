import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { campaignTemplates, platformEnum } from "./campaign-templates.js";
import { dataRows } from "./data-sources.js";

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
  ]
);

// Relations
export const generatedCampaignsRelations = relations(
  generatedCampaigns,
  ({ one, many }) => ({
    template: one(campaignTemplates, {
      fields: [generatedCampaigns.templateId],
      references: [campaignTemplates.id],
    }),
    dataRow: one(dataRows, {
      fields: [generatedCampaigns.dataRowId],
      references: [dataRows.id],
    }),
    syncRecords: many(syncRecords),
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
