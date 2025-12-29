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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { teams } from "./teams.js";
import { dataSources, dataRows } from "./data-sources.js";
import { designTemplates } from "./design-templates.js";

// ============================================================================
// Enums
// ============================================================================

/**
 * Generated Creative Status Enum
 * Tracks the lifecycle of a generated creative
 */
export const generatedCreativeStatusEnum = pgEnum("generated_creative_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Variable values snapshot stored with each generated creative
 * Records the exact variable values used for generation for reproducibility
 */
export interface VariableValuesSnapshot {
  /** Text variables with their resolved values */
  text?: Record<string, string>;
  /** Image variables with their resolved URLs */
  images?: Record<string, string>;
}

// ============================================================================
// Generated Creatives Table
// ============================================================================

/**
 * Generated Creatives Table
 * Stores individual generated images from visual templates
 *
 * Each record represents one rendered image:
 * - Combined template + data row + aspect ratio = unique image
 * - Stored in R2 with CDN URL for delivery
 * - Tracks render performance and errors
 */
export const generatedCreatives = pgTable(
  "generated_creatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),

    // Source references
    templateId: uuid("template_id")
      .notNull()
      .references(() => designTemplates.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id"), // Nullable - references template_variants if using a specific variant
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
    dataRowId: uuid("data_row_id")
      .notNull()
      .references(() => dataRows.id, { onDelete: "cascade" }),

    // Variable snapshot for reproducibility
    variableValues: jsonb("variable_values").$type<VariableValuesSnapshot>(),

    // Storage
    storageKey: varchar("storage_key", { length: 512 }),
    cdnUrl: text("cdn_url"),

    // Dimensions
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    fileSize: integer("file_size"), // bytes
    format: varchar("format", { length: 10 }).notNull().default("png"),

    // Batch tracking
    generationBatchId: uuid("generation_batch_id"), // FK to generation_jobs

    // Status
    status: generatedCreativeStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),

    // Performance tracking
    renderDurationMs: integer("render_duration_ms"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Find all creatives for a team
    index("generated_creatives_team_idx").on(table.teamId),
    // Find all creatives for a batch job
    index("generated_creatives_batch_idx").on(table.generationBatchId),
    // Filter by status
    index("generated_creatives_status_idx").on(table.status),
    // Find creatives by template
    index("generated_creatives_template_idx").on(table.templateId),
    // Find creatives by data row
    index("generated_creatives_data_row_idx").on(table.dataRowId),
    // Combined team + status for filtered listing
    index("generated_creatives_team_status_idx").on(table.teamId, table.status),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const generatedCreativesRelations = relations(
  generatedCreatives,
  ({ one }) => ({
    // Team that owns this creative
    team: one(teams, {
      fields: [generatedCreatives.teamId],
      references: [teams.id],
    }),
    // Source template
    template: one(designTemplates, {
      fields: [generatedCreatives.templateId],
      references: [designTemplates.id],
    }),
    // Source data
    dataSource: one(dataSources, {
      fields: [generatedCreatives.dataSourceId],
      references: [dataSources.id],
    }),
    // Specific data row used
    dataRow: one(dataRows, {
      fields: [generatedCreatives.dataRowId],
      references: [dataRows.id],
    }),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type GeneratedCreative = typeof generatedCreatives.$inferSelect;
export type NewGeneratedCreative = typeof generatedCreatives.$inferInsert;
