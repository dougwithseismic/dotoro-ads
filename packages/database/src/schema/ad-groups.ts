import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { generatedCampaigns } from "./generated-campaigns.js";
import { ads } from "./ads.js";
import { keywords } from "./keywords.js";

/**
 * Ad Group Status Enum
 * Tracks the status of an ad group
 */
export const adGroupStatusEnum = pgEnum("ad_group_status", [
  "active",
  "paused",
  "removed",
]);

/**
 * Ad Groups Table
 * Normalized from JSONB - stores ad groups within campaigns
 * Each ad group belongs to a generated campaign and contains ads and keywords
 */
export const adGroups = pgTable(
  "ad_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => generatedCampaigns.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    settings: jsonb("settings").$type<AdGroupSettings>(),
    platformAdGroupId: varchar("platform_ad_group_id", { length: 255 }), // ID on ad platform after sync
    status: adGroupStatusEnum("status").notNull().default("active"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ad_groups_campaign_idx").on(table.campaignId),
    index("ad_groups_status_idx").on(table.status),
    index("ad_groups_platform_id_idx").on(table.platformAdGroupId),
    index("ad_groups_order_idx").on(table.campaignId, table.orderIndex),
  ]
);

// Relations defined here - includes ads and keywords
export const adGroupsRelations = relations(adGroups, ({ one, many }) => ({
  campaign: one(generatedCampaigns, {
    fields: [adGroups.campaignId],
    references: [generatedCampaigns.id],
  }),
  ads: many(ads),
  keywords: many(keywords),
}));

/**
 * AdGroupSettings - Configuration for ad group behavior
 */
export interface AdGroupSettings {
  /** Bid strategy (e.g., manual_cpc, target_cpa, maximize_conversions) */
  bidStrategy?: string;
  /** Bid amount for manual strategies */
  bidAmount?: number;
  /** Currency for bid amount */
  currency?: string;
  /** Targeting overrides at ad group level */
  targeting?: {
    locations?: Array<{ id: string; name: string; type: string }>;
    demographics?: {
      ageMin?: number;
      ageMax?: number;
      genders?: string[];
    };
    devices?: string[];
    interests?: string[];
    [key: string]: unknown;
  };
  /** Placement preferences */
  placement?: string[];
  /** Ad rotation settings */
  adRotation?: "optimize" | "rotate_indefinitely";
  /** Any additional settings */
  [key: string]: unknown;
}

// Type exports
export type AdGroup = typeof adGroups.$inferSelect;
export type NewAdGroup = typeof adGroups.$inferInsert;
