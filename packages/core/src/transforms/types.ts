/**
 * Transform Engine Types
 *
 * Core types for data transformation and aggregation operations.
 */

/**
 * Supported aggregation functions
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
 * Options for aggregation operations
 */
export interface AggregationOptions {
  /** Separator for CONCAT function (default: ", ") */
  separator?: string;
  /** Condition for COUNT_IF function */
  condition?: ConditionConfig;
  /** Count distinct values only (for COUNT) */
  distinct?: boolean;
  /** Maximum items to collect (for COLLECT) */
  limit?: number;
}

/**
 * Condition configuration for COUNT_IF
 */
export interface ConditionConfig {
  field: string;
  operator: string;
  value: unknown;
}

/**
 * Single aggregation configuration
 */
export interface AggregationConfig {
  /** Source field to aggregate (optional for COUNT) */
  sourceField?: string;
  /** Output field name for the aggregated value */
  outputField: string;
  /** Aggregation function to apply */
  function: AggregationFunction;
  /** Additional options for specific aggregation functions */
  options?: AggregationOptions;
}

/**
 * Complete transform configuration
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
 * Transform execution result
 */
export interface TransformResult {
  /** Aggregated output rows */
  rows: Record<string, unknown>[];
  /** Number of groups created */
  groupCount: number;
  /** Number of source rows processed */
  sourceRowCount: number;
  /** Errors encountered during transform */
  errors: TransformError[];
  /** Warnings about potential issues */
  warnings: TransformWarning[];
}

/**
 * Transform error
 */
export interface TransformError {
  type: "error";
  code: string;
  message: string;
  field?: string;
  rowIndex?: number;
}

/**
 * Transform warning
 */
export interface TransformWarning {
  type: "warning";
  code: string;
  message: string;
  field?: string;
}

/**
 * Field schema for validation
 */
export interface FieldSchema {
  /** Field name (supports dot notation for nested fields) */
  name: string;
  /** Field type */
  type: "string" | "number" | "boolean" | "array" | "object" | "unknown";
  /** Whether the field can be null/undefined */
  nullable?: boolean;
}

/**
 * Transform validation result
 */
export interface TransformValidationResult {
  /** Whether the config is valid */
  valid: boolean;
  /** Validation errors */
  errors: TransformValidationError[];
  /** Validation warnings */
  warnings: TransformValidationWarning[];
  /** Inferred output schema */
  inferredSchema: FieldSchema[];
}

/**
 * Transform validation error
 */
export interface TransformValidationError {
  code: string;
  field: string;
  message: string;
}

/**
 * Transform validation warning
 */
export interface TransformValidationWarning {
  field: string;
  message: string;
}
