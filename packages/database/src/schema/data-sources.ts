import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  jsonb,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Data Source Type Enum
 */
export const dataSourceTypeEnum = pgEnum("data_source_type", [
  "csv",
  "api",
  "manual",
]);

/**
 * Data Sources Table
 * Stores metadata about data sources (CSV uploads, API connections)
 */
export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"), // Nullable for now, will be required when auth is implemented
    name: varchar("name", { length: 255 }).notNull(),
    type: dataSourceTypeEnum("type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("data_sources_type_idx").on(table.type),
    index("data_sources_user_idx").on(table.userId),
  ]
);

/**
 * Data Rows Table
 * Stores normalized data rows from data sources
 */
export const dataRows = pgTable(
  "data_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
    rowData: jsonb("row_data").$type<Record<string, unknown>>().notNull(),
    rowIndex: integer("row_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("data_rows_source_idx").on(table.dataSourceId),
    index("data_rows_source_index_idx").on(table.dataSourceId, table.rowIndex),
  ]
);

/**
 * Column Mappings Table
 * Stores column mappings for data normalization
 */
export const columnMappings = pgTable(
  "column_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dataSourceId: uuid("data_source_id")
      .notNull()
      .references(() => dataSources.id, { onDelete: "cascade" }),
    sourceColumn: varchar("source_column", { length: 255 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
    dataType: varchar("data_type", { length: 50 }).notNull(), // 'string', 'number', 'date', 'boolean'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("column_mappings_source_idx").on(table.dataSourceId),
    uniqueIndex("column_mappings_source_column_unique_idx").on(
      table.dataSourceId,
      table.sourceColumn
    ),
  ]
);

// Relations
export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  dataRows: many(dataRows),
  columnMappings: many(columnMappings),
}));

export const dataRowsRelations = relations(dataRows, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [dataRows.dataSourceId],
    references: [dataSources.id],
  }),
}));

export const columnMappingsRelations = relations(columnMappings, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [columnMappings.dataSourceId],
    references: [dataSources.id],
  }),
}));

// Type exports
export type DataSource = typeof dataSources.$inferSelect;
export type NewDataSource = typeof dataSources.$inferInsert;

export type DataRow = typeof dataRows.$inferSelect;
export type NewDataRow = typeof dataRows.$inferInsert;

export type ColumnMapping = typeof columnMappings.$inferSelect;
export type NewColumnMapping = typeof columnMappings.$inferInsert;
