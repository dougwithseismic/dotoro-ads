import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Creative Type Enum
 */
export const creativeTypeEnum = pgEnum("creative_type", [
  "IMAGE",
  "VIDEO",
  "CAROUSEL",
]);

/**
 * Creative Status Enum
 */
export const creativeStatusEnum = pgEnum("creative_status", [
  "PENDING",
  "UPLOADED",
  "PROCESSING",
  "READY",
  "FAILED",
]);

/**
 * Dimensions JSONB type
 */
export interface CreativeDimensions {
  width: number;
  height: number;
}

/**
 * Creative metadata JSONB type
 */
export interface CreativeMetadata {
  durationSeconds?: number;
  frameRate?: number;
  codec?: string;
  originalFilename?: string;
  uploadedBy?: string;
  [key: string]: unknown;
}

/**
 * Creatives Table
 * Stores creative assets (images, videos) for ad campaigns
 */
export const creatives = pgTable(
  "creatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: varchar("account_id", { length: 255 }).notNull(), // Reddit ad account reference
    name: varchar("name", { length: 255 }).notNull(),
    type: creativeTypeEnum("type").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSize: integer("file_size").notNull(),
    dimensions: jsonb("dimensions").$type<CreativeDimensions>(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    cdnUrl: text("cdn_url"),
    thumbnailKey: varchar("thumbnail_key", { length: 512 }),
    status: creativeStatusEnum("status").notNull().default("PENDING"),
    metadata: jsonb("metadata").$type<CreativeMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("creatives_account_idx").on(table.accountId),
    index("creatives_type_idx").on(table.type),
    index("creatives_status_idx").on(table.status),
    index("creatives_account_type_idx").on(table.accountId, table.type),
    index("creatives_created_at_idx").on(table.createdAt),
    uniqueIndex("creatives_storage_key_idx").on(table.storageKey),
  ]
);

/**
 * Creative Tags Table
 * Stores tags for organizing creatives
 */
export const creativeTags = pgTable(
  "creative_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("creative_tags_creative_idx").on(table.creativeId),
    index("creative_tags_tag_idx").on(table.tag),
    uniqueIndex("creative_tags_creative_tag_unique_idx").on(
      table.creativeId,
      table.tag
    ),
  ]
);

/**
 * Creative Template Links Table
 * Links creatives to template slots for rule-based selection
 */
export const creativeTemplateLinks = pgTable(
  "creative_template_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id").notNull(),
    slotName: varchar("slot_name", { length: 100 }).notNull(),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(0),
    conditions: jsonb("conditions").$type<CreativeSelectionCondition[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("creative_template_links_template_idx").on(table.templateId),
    index("creative_template_links_slot_idx").on(table.slotName),
    index("creative_template_links_creative_idx").on(table.creativeId),
    index("creative_template_links_template_slot_idx").on(
      table.templateId,
      table.slotName
    ),
    index("creative_template_links_priority_idx").on(table.priority),
  ]
);

/**
 * Creative selection condition for rule-based linking
 */
export interface CreativeSelectionCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "in"
    | "not_in";
  value: string | number | boolean | string[];
}

// Relations
export const creativesRelations = relations(creatives, ({ many }) => ({
  tags: many(creativeTags),
  templateLinks: many(creativeTemplateLinks),
}));

export const creativeTagsRelations = relations(creativeTags, ({ one }) => ({
  creative: one(creatives, {
    fields: [creativeTags.creativeId],
    references: [creatives.id],
  }),
}));

export const creativeTemplateLinksRelations = relations(
  creativeTemplateLinks,
  ({ one }) => ({
    creative: one(creatives, {
      fields: [creativeTemplateLinks.creativeId],
      references: [creatives.id],
    }),
  })
);

// Type exports
export type Creative = typeof creatives.$inferSelect;
export type NewCreative = typeof creatives.$inferInsert;

export type CreativeTag = typeof creativeTags.$inferSelect;
export type NewCreativeTag = typeof creativeTags.$inferInsert;

export type CreativeTemplateLink = typeof creativeTemplateLinks.$inferSelect;
export type NewCreativeTemplateLink = typeof creativeTemplateLinks.$inferInsert;
