/**
 * Transform Types for Frontend
 *
 * TypeScript types for the transforms UI components.
 * These align with the API schemas from the backend.
 */

/**
 * Supported aggregation functions
 */
export type AggregationFunction =
  | "COUNT"
  | "SUM"
  | "MIN"
  | "MAX"
  | "AVG"
  | "FIRST"
  | "LAST"
  | "CONCAT"
  | "COLLECT"
  | "DISTINCT_COUNT"
  | "COUNT_IF";

/**
 * Condition configuration for COUNT_IF
 */
export interface ConditionConfig {
  field: string;
  operator: string;
  value: unknown;
}

/**
 * Aggregation options
 */
export interface AggregationOptions {
  separator?: string;
  condition?: ConditionConfig;
  distinct?: boolean;
  limit?: number;
}

/**
 * Single aggregation configuration
 */
export interface AggregationConfig {
  id?: string; // Local ID for React key
  sourceField?: string;
  outputField: string;
  function: AggregationFunction;
  options?: AggregationOptions;
}

/**
 * Transform configuration
 */
export interface TransformConfig {
  groupBy: string | string[];
  aggregations: AggregationConfig[];
  includeGroupKey: boolean;
  outputFieldPrefix?: string;
}

/**
 * Transform entity
 */
export interface Transform {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  sourceDataSourceId: string;
  outputDataSourceId: string;
  config: TransformConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transform list response
 */
export interface TransformListResponse {
  data: Transform[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create transform request
 */
export interface CreateTransformRequest {
  name: string;
  description?: string;
  sourceDataSourceId: string;
  config: TransformConfig;
  enabled?: boolean;
}

/**
 * Update transform request
 */
export interface UpdateTransformRequest {
  name?: string;
  description?: string;
  sourceDataSourceId?: string;
  config?: TransformConfig;
  enabled?: boolean;
}

/**
 * Preview transform request
 */
export interface PreviewTransformRequest {
  sourceDataSourceId: string;
  config: TransformConfig;
  limit?: number;
}

/**
 * Preview response
 */
export interface PreviewResponse {
  rows: Record<string, unknown>[];
  groupCount: number;
  sourceRowCount: number;
  warnings: TransformWarning[];
}

/**
 * Execute response
 */
export interface ExecuteResponse {
  rowsCreated: number;
  groupCount: number;
  sourceRowCount: number;
  executedAt: string;
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
 * Field schema
 */
export interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "unknown";
  nullable?: boolean;
}

/**
 * Validation error
 */
export interface TransformValidationError {
  code: string;
  field: string;
  message: string;
}

/**
 * Validation warning
 */
export interface TransformValidationWarning {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: TransformValidationError[];
  warnings: TransformValidationWarning[];
  inferredSchema: FieldSchema[];
}

/**
 * Data source (simplified for transform builder)
 */
export interface DataSource {
  id: string;
  name: string;
  type: "csv" | "api" | "virtual";
  rowCount: number;
  status: "processing" | "ready" | "error";
  columns?: string[];
}

/**
 * Data source list response
 */
export interface DataSourceListResponse {
  data: DataSource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Aggregation function metadata for UI
 */
export interface AggregationFunctionMeta {
  value: AggregationFunction;
  label: string;
  description: string;
  requiresSourceField: boolean;
  numericOnly: boolean;
  hasOptions: boolean;
  optionFields?: ("separator" | "condition" | "distinct" | "limit")[];
}

/**
 * Available aggregation functions with metadata
 */
export const AGGREGATION_FUNCTIONS: AggregationFunctionMeta[] = [
  {
    value: "COUNT",
    label: "Count",
    description: "Count rows in group",
    requiresSourceField: false,
    numericOnly: false,
    hasOptions: true,
    optionFields: ["distinct"],
  },
  {
    value: "SUM",
    label: "Sum",
    description: "Sum numeric values",
    requiresSourceField: true,
    numericOnly: true,
    hasOptions: false,
  },
  {
    value: "MIN",
    label: "Minimum",
    description: "Minimum value",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: false,
  },
  {
    value: "MAX",
    label: "Maximum",
    description: "Maximum value",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: false,
  },
  {
    value: "AVG",
    label: "Average",
    description: "Average of numeric values",
    requiresSourceField: true,
    numericOnly: true,
    hasOptions: false,
  },
  {
    value: "FIRST",
    label: "First",
    description: "First value encountered",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: false,
  },
  {
    value: "LAST",
    label: "Last",
    description: "Last value encountered",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: false,
  },
  {
    value: "CONCAT",
    label: "Concatenate",
    description: "Concatenate values with separator",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: true,
    optionFields: ["separator"],
  },
  {
    value: "COLLECT",
    label: "Collect",
    description: "Collect all values into array",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: true,
    optionFields: ["limit"],
  },
  {
    value: "DISTINCT_COUNT",
    label: "Distinct Count",
    description: "Count unique values",
    requiresSourceField: true,
    numericOnly: false,
    hasOptions: false,
  },
  {
    value: "COUNT_IF",
    label: "Count If",
    description: "Count rows matching condition",
    requiresSourceField: false,
    numericOnly: false,
    hasOptions: true,
    optionFields: ["condition"],
  },
];

/**
 * Get aggregation function metadata
 */
export function getAggregationFunctionMeta(
  fn: AggregationFunction
): AggregationFunctionMeta | undefined {
  return AGGREGATION_FUNCTIONS.find((f) => f.value === fn);
}

/**
 * Operators for COUNT_IF condition
 */
export const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_than_or_equal", label: "Greater Than or Equal" },
  { value: "less_than_or_equal", label: "Less Than or Equal" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];
