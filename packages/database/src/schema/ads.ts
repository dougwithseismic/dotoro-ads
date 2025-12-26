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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { adGroups } from "./ad-groups.js";

/**
 * Ad Status Enum
 * Tracks the status of an ad
 */
export const adStatusEnum = pgEnum("ad_status", [
  "active",
  "paused",
  "removed",
]);

/**
 * Ads Table
 * Stores individual ads within ad groups
 * Each ad contains creative content and links
 */
export const ads = pgTable(
  "ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adGroupId: uuid("ad_group_id")
      .notNull()
      .references(() => adGroups.id, { onDelete: "cascade" }),
    headline: varchar("headline", { length: 300 }),
    description: text("description"),
    displayUrl: varchar("display_url", { length: 255 }),
    finalUrl: text("final_url"),
    callToAction: varchar("call_to_action", { length: 50 }),
    assets: jsonb("assets").$type<AdAssets>(),
    platformAdId: varchar("platform_ad_id", { length: 255 }), // ID on ad platform after sync
    status: adStatusEnum("status").notNull().default("active"),
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
    index("ads_ad_group_idx").on(table.adGroupId),
    index("ads_status_idx").on(table.status),
    index("ads_platform_id_idx").on(table.platformAdId),
    index("ads_order_idx").on(table.adGroupId, table.orderIndex),
  ]
);

// Relations
export const adsRelations = relations(ads, ({ one }) => ({
  adGroup: one(adGroups, {
    fields: [ads.adGroupId],
    references: [adGroups.id],
  }),
}));

/**
 * AdAssets - Media and additional creative elements
 */
export interface AdAssets {
  /** Image assets */
  images?: Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
    altText?: string;
    type?: "square" | "landscape" | "portrait";
  }>;
  /** Video assets */
  videos?: Array<{
    id?: string;
    url: string;
    thumbnailUrl?: string;
    duration?: number;
  }>;
  /** Logo assets */
  logos?: Array<{
    id?: string;
    url: string;
    width?: number;
    height?: number;
  }>;
  /** Additional headlines for responsive ads */
  additionalHeadlines?: string[];
  /** Additional descriptions for responsive ads */
  additionalDescriptions?: string[];
  /** Site links */
  siteLinks?: Array<{
    text: string;
    url: string;
    description1?: string;
    description2?: string;
  }>;
  /** Callout extensions */
  callouts?: string[];
  /** Structured snippets */
  structuredSnippets?: {
    header: string;
    values: string[];
  };
  /** Any additional assets */
  [key: string]: unknown;
}

// Type exports
export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;
