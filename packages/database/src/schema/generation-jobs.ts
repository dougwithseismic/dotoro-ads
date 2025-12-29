import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { teams } from "./teams.js";
import { dataSources } from "./data-sources.js";
import { designTemplates } from "./design-templates.js";
import { generatedCreatives } from "./generated-creatives.js";

// ============================================================================
// Enums
// ============================================================================

/**
 * Generation Job Status Enum
 * Tracks the lifecycle of a batch generation job
 */
export const generationJobStatusEnum = pgEnum("generation_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Aspect ratio specification for generation
 */
export interface AspectRatioSpec {
  width: number;
  height: number;
}

/**
 * Row filter for selective generation
 * Allows specifying which data rows to include/exclude
 */
export interface RowFilter {
  /** Specific row IDs to include */
  includeIds?: string[];
  /** Specific row IDs to exclude */
  excludeIds?: string[];
  /** Index range (0-indexed) */
  indexRange?: {
    start: number;
    end: number;
  };
}

/**
 * Error log entry for failed generation items
 */
export interface GenerationError {
  rowId: string;
  aspectRatio: AspectRatioSpec;
  error: string;
  timestamp: string;
}

// ============================================================================
// Generation Jobs Table
// ============================================================================

/**
 * Generation Jobs Table
 * Tracks batch generation jobs for creating multiple creatives
 *
 * A single job can generate multiple images:
 * - One template x N data rows x M aspect ratios = N*M images
 * - Progress tracking for real-time updates
 * - Error logging for failed items
 */
export const generationJobs = pgTable(
  "generation_jobs",
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
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),

    // Generation configuration
    aspectRatios: jsonb("aspect_ratios").$type<AspectRatioSpec[]>().notNull(),
    rowFilter: jsonb("row_filter").$type<RowFilter>(),
    outputFormat: varchar("output_format", { length: 10 }).notNull().default("png"),
    quality: integer("quality").notNull().default(90), // 1-100 for JPEG

    // Status tracking
    status: generationJobStatusEnum("status").notNull().default("pending"),
    totalItems: integer("total_items").notNull().default(0),
    processedItems: integer("processed_items").notNull().default(0),
    failedItems: integer("failed_items").notNull().default(0),

    // Results
    outputCreativeIds: jsonb("output_creative_ids").$type<string[]>().default([]),
    errorLog: jsonb("error_log").$type<GenerationError[]>().default([]),

    // Timestamps
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Find all jobs for a team
    index("generation_jobs_team_idx").on(table.teamId),
    // Filter by status
    index("generation_jobs_status_idx").on(table.status),
    // Find jobs by template
    index("generation_jobs_template_idx").on(table.templateId),
    // Combined team + status for listing
    index("generation_jobs_team_status_idx").on(table.teamId, table.status),
    // Sort by creation date
    index("generation_jobs_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const generationJobsRelations = relations(
  generationJobs,
  ({ one, many }) => ({
    // Team that owns this job
    team: one(teams, {
      fields: [generationJobs.teamId],
      references: [teams.id],
    }),
    // Source template
    template: one(designTemplates, {
      fields: [generationJobs.templateId],
      references: [designTemplates.id],
    }),
    // Source data
    dataSource: one(dataSources, {
      fields: [generationJobs.dataSourceId],
      references: [dataSources.id],
    }),
    // Generated creatives from this job
    generatedCreatives: many(generatedCreatives),
  })
);

// ============================================================================
// Type Exports
// ============================================================================

export type GenerationJob = typeof generationJobs.$inferSelect;
export type NewGenerationJob = typeof generationJobs.$inferInsert;
