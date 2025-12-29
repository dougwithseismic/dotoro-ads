import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { teams } from "./teams.js";

// ============================================================================
// Asset Folders Table
// ============================================================================

/**
 * Asset Folders Table
 * Stores folder hierarchy for organizing creative assets
 *
 * Uses materialized path pattern for efficient tree operations:
 * - path: e.g., "/marketing/q4-campaigns" enables prefix queries
 * - parentId: for direct parent lookups and cascade operations
 *
 * A NULL parentId indicates a root-level folder.
 */
export const assetFolders = pgTable(
  "asset_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    // Self-referencing foreign key with set null on delete
    // When a parent folder is deleted, children become root-level folders
    parentId: uuid("parent_id").references((): AnyPgColumn => assetFolders.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    path: text("path").notNull(), // Materialized path e.g., "/root/marketing/q4"
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Index for finding all folders in a team
    index("asset_folders_team_idx").on(table.teamId),
    // Index for finding children of a folder
    index("asset_folders_parent_idx").on(table.parentId),
    // Index for path prefix queries (e.g., find all folders under /marketing)
    index("asset_folders_path_idx").on(table.path),
    // Unique constraint: path must be unique within a team
    uniqueIndex("asset_folders_team_path_unique_idx").on(
      table.teamId,
      table.path
    ),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const assetFolderRelations = relations(assetFolders, ({ one, many }) => ({
  // Team that owns this folder
  team: one(teams, {
    fields: [assetFolders.teamId],
    references: [teams.id],
  }),
  // Parent folder (null for root folders)
  parent: one(assetFolders, {
    fields: [assetFolders.parentId],
    references: [assetFolders.id],
    relationName: "parentChild",
  }),
  // Child folders
  children: many(assetFolders, {
    relationName: "parentChild",
  }),
  // Note: creatives relation is defined in creatives.ts via the folder relation
  // to avoid circular import issues
}));

// ============================================================================
// Type Exports
// ============================================================================

export type AssetFolder = typeof assetFolders.$inferSelect;
export type NewAssetFolder = typeof assetFolders.$inferInsert;
