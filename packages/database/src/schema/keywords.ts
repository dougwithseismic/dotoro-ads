import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { adGroups } from "./ad-groups.js";

/**
 * Keyword Match Type Enum
 * Defines how closely the search query must match the keyword
 */
export const keywordMatchTypeEnum = pgEnum("keyword_match_type", [
  "broad",
  "phrase",
  "exact",
]);

/**
 * Keyword Status Enum
 * Tracks the status of a keyword
 */
export const keywordStatusEnum = pgEnum("keyword_status", [
  "active",
  "paused",
  "removed",
]);

/**
 * Keywords Table
 * Stores keywords for ad groups (primarily for search campaigns)
 * Each keyword defines targeting criteria for when ads should appear
 */
export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adGroupId: uuid("ad_group_id")
      .notNull()
      .references(() => adGroups.id, { onDelete: "cascade" }),
    keyword: varchar("keyword", { length: 255 }).notNull(),
    matchType: keywordMatchTypeEnum("match_type").notNull().default("broad"),
    bid: numeric("bid", { precision: 10, scale: 2 }), // Nullable - uses ad group default if not set
    platformKeywordId: varchar("platform_keyword_id", { length: 255 }), // ID on ad platform after sync
    status: keywordStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("keywords_ad_group_idx").on(table.adGroupId),
    index("keywords_status_idx").on(table.status),
    index("keywords_match_type_idx").on(table.matchType),
    index("keywords_platform_id_idx").on(table.platformKeywordId),
    index("keywords_keyword_idx").on(table.adGroupId, table.keyword),
  ]
);

// Relations
export const keywordsRelations = relations(keywords, ({ one }) => ({
  adGroup: one(adGroups, {
    fields: [keywords.adGroupId],
    references: [adGroups.id],
  }),
}));

// Type exports
export type Keyword = typeof keywords.$inferSelect;
export type NewKeyword = typeof keywords.$inferInsert;
