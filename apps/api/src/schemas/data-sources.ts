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
