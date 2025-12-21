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

/**
 * Platform Enum
 */
export const platformEnum = pgEnum("platform", ["reddit", "google", "facebook"]);

/**
 * Campaign Templates Table
 * Stores campaign structure definitions
 */
export const campaignTemplates = pgTable(
  "campaign_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    name: varchar("name", { length: 255 }).notNull(),
    platform: platformEnum("platform").notNull(),
    structure: jsonb("structure").$type<CampaignStructure>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("campaign_templates_platform_idx").on(table.platform),
    index("campaign_templates_user_idx").on(table.userId),
  ]
);

/**
 * Ad Group Templates Table
 * Stores ad group/ad set template definitions
 */
export const adGroupTemplates = pgTable(
  "ad_group_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignTemplateId: uuid("campaign_template_id")
      .notNull()
      .references(() => campaignTemplates.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    settings: jsonb("settings").$type<AdGroupSettings>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ad_group_templates_campaign_idx").on(table.campaignTemplateId),
  ]
);

/**
 * Ad Templates Table
 * Stores ad template definitions with variable placeholders
 */
export const adTemplates = pgTable(
  "ad_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adGroupTemplateId: uuid("ad_group_template_id")
      .notNull()
      .references(() => adGroupTemplates.id, { onDelete: "cascade" }),
    headline: text("headline"),
    description: text("description"),
    variables: jsonb("variables").$type<AdTemplateVariables>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("ad_templates_ad_group_idx").on(table.adGroupTemplateId)]
);

// Relations
export const campaignTemplatesRelations = relations(
  campaignTemplates,
  ({ many }) => ({
    adGroupTemplates: many(adGroupTemplates),
  })
);

export const adGroupTemplatesRelations = relations(
  adGroupTemplates,
  ({ one, many }) => ({
    campaignTemplate: one(campaignTemplates, {
      fields: [adGroupTemplates.campaignTemplateId],
      references: [campaignTemplates.id],
    }),
    adTemplates: many(adTemplates),
  })
);

export const adTemplatesRelations = relations(adTemplates, ({ one }) => ({
  adGroupTemplate: one(adGroupTemplates, {
    fields: [adTemplates.adGroupTemplateId],
    references: [adGroupTemplates.id],
  }),
}));

// Type definitions for JSONB columns
export interface CampaignStructure {
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  schedule?: {
    startDate?: string;
    endDate?: string;
  };
  [key: string]: unknown;
}

export interface AdGroupSettings {
  bidStrategy?: string;
  bidAmount?: number;
  targeting?: Record<string, unknown>;
  placement?: string[];
  [key: string]: unknown;
}

export interface AdTemplateVariables {
  placeholders: Array<{
    name: string;
    type: "text" | "image" | "url" | "dynamic";
    defaultValue?: string;
    sourceColumn?: string;
  }>;
  [key: string]: unknown;
}

// Type exports
export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type NewCampaignTemplate = typeof campaignTemplates.$inferInsert;

export type AdGroupTemplate = typeof adGroupTemplates.$inferSelect;
export type NewAdGroupTemplate = typeof adGroupTemplates.$inferInsert;

export type AdTemplate = typeof adTemplates.$inferSelect;
export type NewAdTemplate = typeof adTemplates.$inferInsert;
