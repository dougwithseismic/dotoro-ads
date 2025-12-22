/**
 * Transform Module
 *
 * Exports all transform-related types, classes, and utilities
 * for data aggregation and grouping operations.
 */

// Types
export type {
  AggregationFunction,
  AggregationOptions,
  AggregationConfig,
  ConditionConfig,
  TransformConfig,
  TransformResult,
  TransformError,
  TransformWarning,
  FieldSchema,
  TransformValidationResult,
  TransformValidationError,
  TransformValidationWarning,
} from "./types.js";

// Aggregation executor
export { AggregationExecutor } from "./aggregations.js";

// Transform engine
export { TransformEngine } from "./transform-engine.js";

// Transform validator
export { TransformValidator } from "./transform-validator.js";
