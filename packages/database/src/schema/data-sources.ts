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
import { transforms } from "./transforms.js";

/**
 * Data Source Type Enum
 */
export const dataSourceTypeEnum = pgEnum("data_source_type", [
  "csv",
  "api",
  "manual",
  "google-sheets",
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
  sourceTransforms: many(transforms, { relationName: "sourceTransforms" }),
  outputTransforms: many(transforms, { relationName: "outputTransforms" }),
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

/**
 * API Key configuration stored in data source config JSONB
 */
export interface ApiKeyConfig {
  keyHash: string;           // bcrypt hash
  keyPrefix: string;         // ds_live_xxxx for display
  createdAt: string;         // ISO timestamp
  lastUsedAt?: string;       // ISO timestamp
  rateLimit?: number;        // requests per minute (default 100)
}

/**
 * Sync frequency options for API data sources
 */
export type SyncFrequency = 'manual' | '1h' | '6h' | '24h' | '7d';

/**
 * Sync status for tracking last sync operation
 */
export type SyncStatus = 'success' | 'error' | 'syncing';

/**
 * Authentication type for API endpoints
 */
export type ApiAuthType = 'none' | 'bearer' | 'api-key' | 'basic';

/**
 * JSON Flatten Config for API response processing
 * Matches @repo/core JsonFlattenConfig interface
 */
export interface JsonFlattenConfig {
  /**
   * JSONPath to the array of items to flatten (e.g., "data.items", "results").
   * If not provided, the root data is used directly.
   */
  dataPath?: string;

  /**
   * Maximum nesting depth for flattening objects.
   * Objects nested deeper than this will be kept as-is.
   * @default 3
   */
  maxDepth?: number;

  /**
   * How to handle arrays within objects:
   * - 'join': Concatenate array elements into a string
   * - 'first': Take only the first element
   * - 'expand': Create separate rows for each array element (cartesian product)
   */
  arrayHandling: 'join' | 'first' | 'expand';

  /**
   * Separator for 'join' mode.
   * @default ", "
   */
  arraySeparator?: string;
}

/**
 * Configuration for Google Sheets data sources
 */
export interface GoogleSheetsConfig {
  /** The Google Spreadsheet ID (from the URL) */
  spreadsheetId: string;

  /** Human-readable name of the spreadsheet for display */
  spreadsheetName: string;

  /** The name of the specific sheet/tab within the spreadsheet */
  sheetName: string;

  /** How often to sync data from Google Sheets */
  syncFrequency: SyncFrequency;

  /** ISO timestamp of the last successful sync */
  lastSyncAt?: string;

  /** Status of the last sync operation */
  lastSyncStatus?: SyncStatus;

  /** Error message from the last failed sync */
  lastSyncError?: string;

  /** Row number that contains headers (1-indexed). Defaults to 1 */
  headerRow?: number;
}

/**
 * Configuration for API-type data sources that fetch from external APIs
 */
export interface ApiFetchConfig {
  /** URL of the API endpoint to fetch data from */
  url: string;

  /** HTTP method for the request */
  method: 'GET' | 'POST';

  /** Optional HTTP headers to include in the request */
  headers?: Record<string, string>;

  /** Optional JSON string body for POST requests */
  body?: string;

  /** How often to sync data from the API */
  syncFrequency: SyncFrequency;

  /** ISO timestamp of the last successful sync */
  lastSyncAt?: string;

  /** Status of the last sync operation */
  lastSyncStatus?: SyncStatus;

  /** Error message from the last failed sync */
  lastSyncError?: string;

  /** Duration of the last sync in milliseconds */
  lastSyncDuration?: number;

  /** Configuration for flattening the JSON response */
  flattenConfig?: JsonFlattenConfig;

  /** Type of authentication to use */
  authType?: ApiAuthType;

  /** Authentication credentials (token for bearer, key for api-key, base64 for basic) */
  authCredentials?: string;
}

/**
 * Data Source Config interface with API key, API fetch, and Google Sheets support
 */
export interface DataSourceConfig {
  // CSV parsing options
  hasHeader?: boolean;
  delimiter?: string;

  // Error state
  error?: string;

  // API Key for external push
  apiKey?: ApiKeyConfig;

  // API Fetch configuration (for type: 'api' data sources)
  apiFetch?: ApiFetchConfig;

  // Google Sheets configuration (for type: 'google-sheets' data sources)
  googleSheets?: GoogleSheetsConfig;

  // Additional dynamic properties
  [key: string]: unknown;
}
