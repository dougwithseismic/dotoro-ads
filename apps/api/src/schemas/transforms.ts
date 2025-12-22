import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";

/**
 * Transform API Schemas
 *
 * Zod schemas for the Transform API layer, compatible with
 * the core transform engine types.
 */

/**
 * Aggregation function enum - all supported aggregation operations
 */
export const aggregationFunctionSchema = z.enum([
  "COUNT",
  "SUM",
  "MIN",
  "MAX",
  "AVG",
  "FIRST",
  "LAST",
  "CONCAT",
  "COLLECT",
  "DISTINCT_COUNT",
  "COUNT_IF",
]);

export type AggregationFunction = z.infer<typeof aggregationFunctionSchema>;

/**
 * Condition schema for COUNT_IF aggregation
 * Note: value is required to match core types
 */
export const transformConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.unknown(), // Using unknown to support any value type
});

export type TransformCondition = z.infer<typeof transformConditionSchema>;

/**
 * Aggregation options schema
 */
export const aggregationOptionsSchema = z.object({
  /** Separator for CONCAT function (default: ", ") */
  separator: z.string().optional(),
  /** Condition for COUNT_IF function */
  condition: transformConditionSchema.optional(),
  /** Count distinct values only (for COUNT) */
  distinct: z.boolean().optional(),
  /** Maximum items to collect (for COLLECT) */
  limit: z.number().int().positive().optional(),
});

export type AggregationOptions = z.infer<typeof aggregationOptionsSchema>;

/**
 * Aggregation configuration schema
 * Defines a single aggregation operation within a transform
 */
export const aggregationConfigSchema = z.object({
  /** Source field to aggregate (optional for COUNT) */
  sourceField: z.string().min(1).optional(),
  /** Output field name for the aggregated value */
  outputField: z
    .string()
    .min(1)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Output field must be a valid identifier (start with letter or underscore, contain only alphanumeric and underscore)"
    ),
  /** Aggregation function to apply */
  function: aggregationFunctionSchema,
  /** Additional options for specific aggregation functions */
  options: aggregationOptionsSchema.optional(),
});

export type AggregationConfig = z.infer<typeof aggregationConfigSchema>;

/**
 * Transform configuration schema
 * Defines the complete configuration for a data transform
 */
export const transformConfigSchema = z.object({
  /** Field(s) to group rows by */
  groupBy: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  /** List of aggregation operations to apply */
  aggregations: z.array(aggregationConfigSchema).min(1),
  /** Whether to include the group key field(s) in output (default: true) */
  includeGroupKey: z.boolean().default(true),
  /** Optional prefix for aggregated output field names */
  outputFieldPrefix: z.string().optional(),
});

export type TransformConfig = z.infer<typeof transformConfigSchema>;

/**
 * Create transform request schema
 */
export const createTransformSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sourceDataSourceId: uuidSchema,
  config: transformConfigSchema,
  enabled: z.boolean().default(true),
});

export type CreateTransform = z.infer<typeof createTransformSchema>;

/**
 * Update transform request schema
 */
export const updateTransformSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sourceDataSourceId: uuidSchema.optional(),
  config: transformConfigSchema.optional(),
  enabled: z.boolean().optional(),
});

export type UpdateTransform = z.infer<typeof updateTransformSchema>;

/**
 * Transform response schema (returned from API)
 */
export const transformResponseSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  sourceDataSourceId: uuidSchema,
  outputDataSourceId: uuidSchema,
  config: transformConfigSchema,
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TransformResponse = z.infer<typeof transformResponseSchema>;

/**
 * Transform list response schema
 */
export const transformListResponseSchema = z.object({
  data: z.array(transformResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type TransformListResponse = z.infer<typeof transformListResponseSchema>;

/**
 * Transform query parameters
 */
export const transformQuerySchema = paginationSchema.extend({
  sourceDataSourceId: uuidSchema.optional(),
  enabled: z.coerce.boolean().optional(),
});

export type TransformQuery = z.infer<typeof transformQuerySchema>;

/**
 * Transform warning schema
 */
export const transformWarningSchema = z.object({
  type: z.literal("warning"),
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export type TransformWarning = z.infer<typeof transformWarningSchema>;

/**
 * Preview transform request schema (for draft transforms)
 */
export const previewTransformSchema = z.object({
  sourceDataSourceId: uuidSchema,
  config: transformConfigSchema,
  limit: z.number().int().positive().max(100).default(10),
});

export type PreviewTransform = z.infer<typeof previewTransformSchema>;

/**
 * Preview existing transform query schema
 */
export const previewExistingTransformQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PreviewExistingTransformQuery = z.infer<typeof previewExistingTransformQuerySchema>;

/**
 * Preview response schema
 */
export const previewResponseSchema = z.object({
  rows: z.array(z.record(z.unknown())),
  groupCount: z.number(),
  sourceRowCount: z.number(),
  warnings: z.array(transformWarningSchema),
});

export type PreviewResponse = z.infer<typeof previewResponseSchema>;

/**
 * Execute transform response schema
 */
export const executeResponseSchema = z.object({
  rowsCreated: z.number(),
  groupCount: z.number(),
  sourceRowCount: z.number(),
  executedAt: z.string().datetime(),
});

export type ExecuteResponse = z.infer<typeof executeResponseSchema>;

/**
 * Validation error schema
 */
export const transformValidationErrorSchema = z.object({
  code: z.string(),
  field: z.string(),
  message: z.string(),
});

export type TransformValidationError = z.infer<typeof transformValidationErrorSchema>;

/**
 * Validation warning schema
 */
export const transformValidationWarningSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type TransformValidationWarning = z.infer<typeof transformValidationWarningSchema>;

/**
 * Field schema for validation
 */
export const fieldSchemaSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object", "unknown"]),
  nullable: z.boolean().optional(),
});

export type FieldSchema = z.infer<typeof fieldSchemaSchema>;

/**
 * Validate config request schema
 */
export const validateConfigRequestSchema = z.object({
  sourceDataSourceId: uuidSchema,
  config: transformConfigSchema,
});

export type ValidateConfigRequest = z.infer<typeof validateConfigRequestSchema>;

/**
 * Validation result response schema
 */
export const validationResultResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(transformValidationErrorSchema),
  warnings: z.array(transformValidationWarningSchema),
  inferredSchema: z.array(fieldSchemaSchema),
});

export type ValidationResultResponse = z.infer<typeof validationResultResponseSchema>;
