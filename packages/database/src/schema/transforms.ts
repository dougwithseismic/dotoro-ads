import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { dataSources } from "./data-sources.js";

/**
 * Aggregation Function Type
 * Defines all supported aggregation operations for transforms
 */
export type AggregationFunction =
  | "COUNT" // Count rows in group
  | "SUM" // Sum numeric values
  | "MIN" // Minimum value
  | "MAX" // Maximum value
  | "AVG" // Average of numeric values
  | "FIRST" // First value encountered
  | "LAST" // Last value encountered
  | "CONCAT" // Concatenate string values (with separator)
  | "COLLECT" // Collect all values into array
  | "DISTINCT_COUNT" // Count unique values
  | "COUNT_IF"; // Count rows matching condition

/**
 * Aggregation Config Interface
 * Defines a single aggregation operation within a transform
 */
export interface AggregationConfig {
  /** Source field to aggregate (optional for COUNT) */
  sourceField?: string;
  /** Output field name for the aggregated value */
  outputField: string;
  /** Aggregation function to apply */
  function: AggregationFunction;
  /** Additional options for specific aggregation functions */
  options?: {
    /** Separator for CONCAT function */
    separator?: string;
    /** Condition for COUNT_IF */
    condition?: {
      field: string;
      operator: string;
      value: unknown;
    };
    /** Whether to count distinct values (for COUNT) */
    distinct?: boolean;
    /** Maximum items to collect (for COLLECT) */
    limit?: number;
  };
}

/**
 * Transform Config Interface
 * Defines the complete configuration for a data transform
 */
export interface TransformConfig {
  /** Field(s) to group rows by */
  groupBy: string | string[];
  /** List of aggregation operations to apply */
  aggregations: AggregationConfig[];
  /** Whether to include the group key field(s) in output */
  includeGroupKey: boolean;
  /** Optional prefix for aggregated output field names */
  outputFieldPrefix?: string;
}

/**
 * Transforms Table
 * Stores transform definitions that aggregate/group data from a source data source
 * and produce a virtual output data source
 */
export const transforms = pgTable(
  "transforms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    sourceDataSourceId: uuid("source_data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
    outputDataSourceId: uuid("output_data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
    config: jsonb("config").$type<TransformConfig>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("transforms_source_idx").on(table.sourceDataSourceId),
    index("transforms_output_idx").on(table.outputDataSourceId),
    index("transforms_enabled_idx").on(table.enabled),
    index("transforms_user_idx").on(table.userId),
  ]
);

// Relations
export const transformsRelations = relations(transforms, ({ one }) => ({
  sourceDataSource: one(dataSources, {
    fields: [transforms.sourceDataSourceId],
    references: [dataSources.id],
    relationName: "sourceTransforms",
  }),
  outputDataSource: one(dataSources, {
    fields: [transforms.outputDataSourceId],
    references: [dataSources.id],
    relationName: "outputTransforms",
  }),
}));

// Type exports
export type Transform = typeof transforms.$inferSelect;
export type NewTransform = typeof transforms.$inferInsert;
