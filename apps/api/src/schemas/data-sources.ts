import { z } from "zod";
import { timestampsSchema, uuidSchema, paginationSchema } from "./common.js";

/**
 * Data Source Type Enum
 */
export const dataSourceTypeSchema = z.enum(["csv", "api", "manual"]);
export type DataSourceType = z.infer<typeof dataSourceTypeSchema>;

/**
 * Data Source Schema - full representation
 */
export const dataSourceSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string().min(1).max(255),
  type: dataSourceTypeSchema,
  config: z.record(z.unknown()).nullable(),
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
 * Preview Request Schema
 */
export const previewRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
});

export type PreviewRequest = z.infer<typeof previewRequestSchema>;

/**
 * Upload Response Schema
 */
export const uploadResponseSchema = z.object({
  message: z.string(),
  rowsProcessed: z.number(),
  columnMappings: z.array(columnMappingSchema),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;

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
