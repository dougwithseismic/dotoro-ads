import { z } from "zod";
import { timestampsSchema, uuidSchema, paginationSchema } from "./common.js";

/**
 * Data Source Type Enum
 */
export const dataSourceTypeSchema = z.enum(["csv", "api", "manual"]);
export type DataSourceType = z.infer<typeof dataSourceTypeSchema>;

/**
 * Column Type Enum - matches @repo/core ColumnType
 */
export const columnTypeSchema = z.enum([
  "string",
  "number",
  "date",
  "boolean",
  "url",
  "email",
]);
export type ColumnType = z.infer<typeof columnTypeSchema>;

/**
 * Data Source Status Enum
 * Represents the lifecycle state of a data source:
 * - "processing": Reserved for future async data ingestion workflows
 * - "ready": Data source is available for use (may have 0 or more rows)
 * - "error": Data source encountered an error (check config.error for details)
 */
export const dataSourceStatusSchema = z.enum(["processing", "ready", "error"]);
export type DataSourceStatus = z.infer<typeof dataSourceStatusSchema>;

/**
 * Data Source Schema - full representation
 */
export const dataSourceSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string().min(1).max(255),
  type: dataSourceTypeSchema,
  config: z.record(z.unknown()).nullable(),
  rowCount: z.number().int().min(0),
  status: dataSourceStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DataSource = z.infer<typeof dataSourceSchema>;

/**
 * Create Data Source Schema
 */
export const createDataSourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: dataSourceTypeSchema,
  config: z.record(z.unknown()).optional(),
});

export type CreateDataSource = z.infer<typeof createDataSourceSchema>;

/**
 * Update Data Source Schema
 */
export const updateDataSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: dataSourceTypeSchema.optional(),
  config: z.record(z.unknown()).optional(),
});

export type UpdateDataSource = z.infer<typeof updateDataSourceSchema>;

/**
 * Data Row Schema
 */
export const dataRowSchema = z.object({
  id: uuidSchema,
  dataSourceId: uuidSchema,
  rowData: z.record(z.unknown()),
  rowIndex: z.number().int().min(0),
  createdAt: z.string().datetime(),
});

export type DataRow = z.infer<typeof dataRowSchema>;

/**
 * Data Rows Query Parameters
 */
export const dataRowsQuerySchema = paginationSchema;

export type DataRowsQuery = z.infer<typeof dataRowsQuerySchema>;

/**
 * Column Mapping Schema
 */
export const columnMappingSchema = z.object({
  id: uuidSchema,
  dataSourceId: uuidSchema,
  sourceColumn: z.string().min(1).max(255),
  normalizedName: z.string().min(1).max(255),
  dataType: z.string().min(1).max(50),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

/**
 * Preview Request Schema - for existing data source preview
 */
export const previewRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
});

export type PreviewRequest = z.infer<typeof previewRequestSchema>;

/**
 * CSV Preview Request Schema - for previewing CSV content before upload
 */
export const csvPreviewRequestSchema = z.object({
  content: z.string().min(1),
  rows: z.number().int().min(1).max(100).default(10),
});

export type CsvPreviewRequest = z.infer<typeof csvPreviewRequestSchema>;

/**
 * Column Analysis Schema - analysis result for a single column
 */
export const columnAnalysisSchema = z.object({
  originalName: z.string(),
  suggestedName: z.string(),
  detectedType: columnTypeSchema,
  sampleValues: z.array(z.string()),
  nullCount: z.number().int().min(0),
  uniqueCount: z.number().int().min(0),
});

export type ColumnAnalysisResponse = z.infer<typeof columnAnalysisSchema>;

/**
 * Upload Response Schema - returned after CSV processing
 */
export const uploadResponseSchema = z.object({
  dataSourceId: uuidSchema,
  headers: z.array(z.string()),
  columns: z.array(columnAnalysisSchema),
  rowCount: z.number().int().min(0),
  preview: z.array(z.record(z.unknown())),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

/**
 * CSV Preview Response Schema
 */
export const csvPreviewResponseSchema = z.object({
  headers: z.array(z.string()),
  preview: z.array(z.record(z.string())),
});

export type CsvPreviewResponse = z.infer<typeof csvPreviewResponseSchema>;

/**
 * Validation Rule Schema - for validating data rows
 */
export const validationRuleSchema = z.object({
  field: z.string().min(1),
  required: z.boolean().optional(),
  type: columnTypeSchema.optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  pattern: z.string().optional(),
});

export type ValidationRuleRequest = z.infer<typeof validationRuleSchema>;

/**
 * Validation Request Schema
 */
export const validateRequestSchema = z.object({
  rules: z.array(validationRuleSchema).min(1),
});

export type ValidateRequest = z.infer<typeof validateRequestSchema>;

/**
 * Row Error Schema
 */
export const rowErrorSchema = z.object({
  row: z.number().int().min(0),
  field: z.string(),
  value: z.unknown(),
  message: z.string(),
});

export type RowError = z.infer<typeof rowErrorSchema>;

/**
 * Validation Response Schema
 */
export const validationResponseSchema = z.object({
  valid: z.boolean(),
  totalRows: z.number().int().min(0),
  validRows: z.number().int().min(0),
  invalidRows: z.number().int().min(0),
  errors: z.array(rowErrorSchema),
  errorsByField: z.record(z.array(rowErrorSchema)),
});

export type ValidationResponse = z.infer<typeof validationResponseSchema>;

/**
 * Analyze Response Schema
 */
export const analyzeResponseSchema = z.object({
  columns: z.array(columnAnalysisSchema),
});

/**
 * Data Source List Response
 */
export const dataSourceListResponseSchema = z.object({
  data: z.array(dataSourceSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type DataSourceListResponse = z.infer<typeof dataSourceListResponseSchema>;

/**
 * Data Rows List Response
 */
export const dataRowsListResponseSchema = z.object({
  data: z.array(dataRowSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type DataRowsListResponse = z.infer<typeof dataRowsListResponseSchema>;

/**
 * Simplified Column Mapping for Detail Response
 * Matches frontend ColumnMapping type expectations
 */
export const columnMappingDetailSchema = z.object({
  sourceColumn: z.string(),
  normalizedName: z.string(),
  dataType: z.string(),
});

export type ColumnMappingDetail = z.infer<typeof columnMappingDetailSchema>;

/**
 * Data Source Detail Schema - Extended response with data preview and column mappings
 */
export const dataSourceDetailSchema = dataSourceSchema.extend({
  data: z.array(z.record(z.unknown())),
  columnMappings: z.array(columnMappingDetailSchema),
  columns: z.array(z.string()),
});

export type DataSourceDetailResponse = z.infer<typeof dataSourceDetailSchema>;

// ============================================================================
// Item CRUD Schemas (Phase 0A)
// ============================================================================

/**
 * Insert mode for bulk insert operations.
 * - "append": Add items to existing data
 * - "replace": Clear existing items and insert new ones
 */
export const insertModeSchema = z.enum(["append", "replace"]);
export type InsertMode = z.infer<typeof insertModeSchema>;

/**
 * Bulk Insert Items Request Schema
 * Used for POST /api/v1/data-sources/:id/items
 */
export const bulkInsertItemsRequestSchema = z.object({
  items: z.array(z.record(z.unknown())).min(1, "At least one item is required"),
  mode: insertModeSchema,
});

export type BulkInsertItemsRequest = z.infer<typeof bulkInsertItemsRequestSchema>;

/**
 * Bulk Insert Items Response Schema
 * Returns insert statistics and limit status
 */
export const bulkInsertItemsResponseSchema = z.object({
  inserted: z.number().int().min(0),
  total: z.number().int().min(0),
  limitReached: z.boolean().optional(),
});

export type BulkInsertItemsResponse = z.infer<typeof bulkInsertItemsResponseSchema>;

/**
 * Update Item Request Schema
 * Used for PUT /api/v1/data-sources/:id/items/:itemId
 */
export const updateItemRequestSchema = z.object({
  data: z.record(z.unknown()),
});

export type UpdateItemRequest = z.infer<typeof updateItemRequestSchema>;

/**
 * Clear Items Query Schema
 * Requires confirm=true to prevent accidental deletion
 */
export const clearItemsQuerySchema = z.object({
  confirm: z.enum(["true"]).describe("Must be 'true' to confirm deletion"),
});

export type ClearItemsQuery = z.infer<typeof clearItemsQuerySchema>;

/**
 * Clear Items Response Schema
 * Returns count of deleted items
 */
export const clearItemsResponseSchema = z.object({
  deleted: z.number().int().min(0),
});

export type ClearItemsResponse = z.infer<typeof clearItemsResponseSchema>;

/**
 * Item ID Path Parameters Schema
 * Used for single item operations
 */
export const itemIdParamSchema = z.object({
  id: uuidSchema,
  itemId: uuidSchema,
});

export type ItemIdParam = z.infer<typeof itemIdParamSchema>;

// ============================================================================
// API Key Schemas (Phase 0B)
// ============================================================================

/**
 * API Key Config Schema
 * Stored in data source config JSONB field
 */
export const apiKeyConfigSchema = z.object({
  keyHash: z.string(), // bcrypt hash
  keyPrefix: z.string(), // ds_live_xxxx... for display
  createdAt: z.string().datetime(), // ISO timestamp
  lastUsedAt: z.string().datetime().optional(), // ISO timestamp
  rateLimit: z.number().int().min(1).optional(), // requests per minute (default 100)
});

export type ApiKeyConfig = z.infer<typeof apiKeyConfigSchema>;

/**
 * API Key Generation Response Schema
 * Returned when generating a new API key
 */
export const apiKeyResponseSchema = z.object({
  key: z.string(), // ds_live_xxxxxxxxxxxx (shown ONCE)
  keyPrefix: z.string(), // ds_live_xxxx... (for display)
  createdAt: z.string().datetime(), // ISO timestamp
});

export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;

/**
 * API Key Regeneration Response Schema
 * Returned when regenerating an API key
 */
export const apiKeyRegenerateResponseSchema = apiKeyResponseSchema.extend({
  previousKeyRevoked: z.literal(true),
});

export type ApiKeyRegenerateResponse = z.infer<typeof apiKeyRegenerateResponseSchema>;

// ============================================================================
// API Fetch Schemas (Phase 2B)
// ============================================================================

/**
 * Sync Frequency Schema
 */
export const syncFrequencySchema = z.enum(["manual", "1h", "6h", "24h", "7d"]);
export type SyncFrequency = z.infer<typeof syncFrequencySchema>;

/**
 * Auth Type Schema
 */
export const apiAuthTypeSchema = z.enum(["none", "bearer", "api-key", "basic"]);
export type ApiAuthType = z.infer<typeof apiAuthTypeSchema>;

/**
 * JSON Flatten Config Schema
 */
export const jsonFlattenConfigSchema = z.object({
  dataPath: z.string().optional(),
  maxDepth: z.number().int().min(1).max(10).optional(),
  arrayHandling: z.enum(["join", "first", "expand"]),
  arraySeparator: z.string().optional(),
});

export type JsonFlattenConfig = z.infer<typeof jsonFlattenConfigSchema>;

/**
 * Test Connection Request Schema
 * Used for POST /api/v1/data-sources/test-connection
 */
export const testConnectionRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
  method: z.enum(["GET", "POST"]),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  flattenConfig: jsonFlattenConfigSchema.optional(),
  authType: apiAuthTypeSchema.optional(),
  authCredentials: z.string().optional(),
});

export type TestConnectionRequest = z.infer<typeof testConnectionRequestSchema>;

/**
 * Test Connection Response Schema
 */
export const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  preview: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.unknown()),
  }).optional(),
  error: z.string().optional(),
});

export type TestConnectionResponse = z.infer<typeof testConnectionResponseSchema>;
