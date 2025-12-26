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
import { dataSources } from "./data-sources.js";
import { campaignTemplates } from "./campaign-templates.js";
import { generatedCampaigns } from "./generated-campaigns.js";

/**
 * Campaign Set Status Enum
 * Tracks the lifecycle status of a campaign set
 */
export const campaignSetStatusEnum = pgEnum("campaign_set_status", [
  "draft",
  "pending",
  "syncing",
  "active",
  "paused",
  "completed",
  "archived",
  "error",
]);

/**
 * Campaign Set Sync Status Enum
 * Tracks synchronization status with ad platforms
 */
export const campaignSetSyncStatusEnum = pgEnum("campaign_set_sync_status", [
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
]);

/**
 * Campaign Sets Table
 * A campaign set is a collection of campaigns created from the wizard.
 * It stores the configuration used to generate campaigns and tracks their status.
 */
export const campaignSets = pgTable(
  "campaign_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id").references(() => campaignTemplates.id, {
      onDelete: "set null",
    }),
    config: jsonb("config").$type<CampaignSetConfig>(),
    status: campaignSetStatusEnum("status").notNull().default("draft"),
    syncStatus: campaignSetSyncStatusEnum("sync_status")
      .notNull()
      .default("pending"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("campaign_sets_user_idx").on(table.userId),
    index("campaign_sets_status_idx").on(table.status),
    index("campaign_sets_sync_status_idx").on(table.syncStatus),
    index("campaign_sets_data_source_idx").on(table.dataSourceId),
    index("campaign_sets_template_idx").on(table.templateId),
  ]
);

// Relations
export const campaignSetsRelations = relations(campaignSets, ({ one, many }) => ({
  dataSource: one(dataSources, {
    fields: [campaignSets.dataSourceId],
    references: [dataSources.id],
  }),
  template: one(campaignTemplates, {
    fields: [campaignSets.templateId],
    references: [campaignTemplates.id],
  }),
  campaigns: many(generatedCampaigns),
}));

/**
 * CampaignSetConfig - Wizard state snapshot
 * Stores the complete configuration from the campaign wizard
 * Aligned with core types for capturing complete wizard state
 */
export interface CampaignSetConfig {
  /** ID of the data source used for generation */
  dataSourceId: string;
  /** Available columns from the data source */
  availableColumns: string[];
  /** Selected advertising platforms */
  selectedPlatforms: string[];
  /** Selected ad types per platform */
  selectedAdTypes: Record<string, string[]>;
  /** Campaign naming and structure configuration */
  campaignConfig: {
    /** Pattern for campaign names, e.g., "{brand}-performance" */
    namePattern: string;
  };
  /** Budget configuration */
  budgetConfig?: {
    type: "daily" | "lifetime" | "shared";
    amountPattern: string;
    currency: string;
    pacing?: "standard" | "accelerated";
  };
  /** Per-platform bidding configuration */
  biddingConfig?: Record<string, unknown>;
  /** Hierarchy configuration snapshot from wizard */
  hierarchyConfig: {
    adGroups: Array<{
      namePattern: string;
      keywords?: string[];
      ads: Array<{
        headline?: string;
        description?: string;
        displayUrl?: string;
        finalUrl?: string;
        callToAction?: string;
      }>;
    }>;
  };
  /** Targeting configuration */
  targetingConfig?: Record<string, unknown>;
  /** Inline rules for data transformation */
  inlineRules?: Array<{
    field: string;
    operator: string;
    value: unknown;
    enabled: boolean;
  }>;
  /** Timestamp when campaigns were generated (ISO date string) */
  generatedAt: string;
  /** Number of data rows processed */
  rowCount: number;
  /** Number of campaigns generated */
  campaignCount: number;
}

// Type exports
export type CampaignSet = typeof campaignSets.$inferSelect;
export type NewCampaignSet = typeof campaignSets.$inferInsert;
