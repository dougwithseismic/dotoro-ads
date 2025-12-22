/**
 * Transform Validator
 *
 * Validates transform configurations against source schemas,
 * checking field existence, type compatibility, and output schema inference.
 */

import type {
  TransformConfig,
  FieldSchema,
  TransformValidationResult,
  TransformValidationError,
  TransformValidationWarning,
  AggregationFunction,
} from "./types.js";

/**
 * Valid identifier pattern (JavaScript variable name rules)
 */
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Aggregation functions that require numeric source fields
 */
const NUMERIC_FUNCTIONS: AggregationFunction[] = ["SUM", "AVG"];

/**
 * Aggregation functions that don't require a source field
 */
const NO_SOURCE_REQUIRED: AggregationFunction[] = ["COUNT", "COUNT_IF"];

/**
 * Valid operators for COUNT_IF conditions
 */
const VALID_OPERATORS = [
  "equals", "not_equals", "greater_than", "less_than",
  "greater_than_or_equal", "less_than_or_equal", "contains",
  "not_contains", "starts_with", "ends_with", "in", "not_in",
  "is_empty", "is_not_empty"
];

/**
 * Validates transform configurations and infers output schemas
 */
export class TransformValidator {
  /**
   * Validate a transform config against a source schema
   */
  validateConfig(
    config: TransformConfig,
    sourceSchema: FieldSchema[]
  ): TransformValidationResult {
    const errors: TransformValidationError[] = [];
    const warnings: TransformValidationWarning[] = [];

    // Check for empty aggregations
    if (!config.aggregations || config.aggregations.length === 0) {
      errors.push({
        code: "NO_AGGREGATIONS",
        field: "aggregations",
        message: "Transform must have at least one aggregation",
      });
      return {
        valid: false,
        errors,
        warnings,
        inferredSchema: [],
      };
    }

    // Validate groupBy fields
    this.validateGroupByFields(config.groupBy, sourceSchema, errors);

    // Validate aggregation fields
    this.validateAggregationFields(
      config.aggregations,
      sourceSchema,
      errors,
      warnings
    );

    // Validate output field names
    this.validateOutputFieldNames(config, errors);

    // Check for duplicate output fields
    this.validateDuplicateOutputFields(config, errors);

    // Infer output schema
    const inferredSchema = this.inferOutputSchema(config, sourceSchema);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      inferredSchema,
    };
  }

  /**
   * Validate that groupBy fields exist in source schema
   */
  private validateGroupByFields(
    groupBy: string | string[],
    sourceSchema: FieldSchema[],
    errors: TransformValidationError[]
  ): void {
    const fields = Array.isArray(groupBy) ? groupBy : [groupBy];
    const schemaFieldNames = new Set(sourceSchema.map((f) => f.name));

    for (const field of fields) {
      if (!this.fieldExistsInSchema(field, schemaFieldNames, sourceSchema)) {
        errors.push({
          code: "FIELD_NOT_FOUND",
          field,
          message: `Group by field "${field}" does not exist in source schema`,
        });
      }
    }
  }

  /**
   * Validate aggregation configurations
   */
  private validateAggregationFields(
    aggregations: TransformConfig["aggregations"],
    sourceSchema: FieldSchema[],
    errors: TransformValidationError[],
    warnings: TransformValidationWarning[]
  ): void {
    const schemaFieldNames = new Set(sourceSchema.map((f) => f.name));

    for (const agg of aggregations) {
      // Check if source field is required and exists
      if (!NO_SOURCE_REQUIRED.includes(agg.function)) {
        if (!agg.sourceField) {
          errors.push({
            code: "MISSING_SOURCE_FIELD",
            field: agg.outputField,
            message: `Aggregation "${agg.function}" requires a sourceField`,
          });
          continue;
        }

        if (
          !this.fieldExistsInSchema(
            agg.sourceField,
            schemaFieldNames,
            sourceSchema
          )
        ) {
          errors.push({
            code: "FIELD_NOT_FOUND",
            field: agg.sourceField,
            message: `Source field "${agg.sourceField}" does not exist in source schema`,
          });
          continue;
        }

        // Validate type compatibility
        this.validateFunctionTypeCompatibility(
          agg.function,
          agg.sourceField,
          sourceSchema,
          warnings
        );
      }

      // Validate COUNT_IF condition if present
      if (agg.function === "COUNT_IF" && agg.options?.condition) {
        const condition = agg.options.condition as { field: string; operator: string; value: unknown };
        const conditionField = condition.field;
        if (
          !this.fieldExistsInSchema(
            conditionField,
            schemaFieldNames,
            sourceSchema
          )
        ) {
          errors.push({
            code: "FIELD_NOT_FOUND",
            field: conditionField,
            message: `COUNT_IF condition field "${conditionField}" does not exist in source schema`,
          });
        }

        // Validate operator
        if (!VALID_OPERATORS.includes(condition.operator)) {
          errors.push({
            code: "INVALID_OPERATOR",
            field: agg.outputField,
            message: `COUNT_IF condition has invalid operator "${condition.operator}"`,
          });
        }
      }

      // Validate COUNT with distinct and sourceField
      if (
        agg.function === "COUNT" &&
        agg.options?.distinct &&
        agg.sourceField
      ) {
        if (
          !this.fieldExistsInSchema(
            agg.sourceField,
            schemaFieldNames,
            sourceSchema
          )
        ) {
          errors.push({
            code: "FIELD_NOT_FOUND",
            field: agg.sourceField,
            message: `COUNT distinct source field "${agg.sourceField}" does not exist in source schema`,
          });
        }
      }
    }
  }

  /**
   * Validate function type compatibility and add warnings for potential issues
   */
  private validateFunctionTypeCompatibility(
    fn: AggregationFunction,
    sourceField: string,
    sourceSchema: FieldSchema[],
    warnings: TransformValidationWarning[]
  ): void {
    const fieldSchema = sourceSchema.find((f) => f.name === sourceField);
    if (!fieldSchema) {
      return; // Field not found, handled elsewhere
    }

    // Check numeric functions
    if (NUMERIC_FUNCTIONS.includes(fn) && fieldSchema.type !== "number") {
      warnings.push({
        field: sourceField,
        message: `${fn} aggregation on non-numeric field "${sourceField}" (type: ${fieldSchema.type}) may produce unexpected results`,
      });
    }
  }

  /**
   * Validate output field names are valid identifiers
   */
  private validateOutputFieldNames(
    config: TransformConfig,
    errors: TransformValidationError[]
  ): void {
    const prefix = config.outputFieldPrefix ?? "";

    for (const agg of config.aggregations) {
      const outputField = prefix + agg.outputField;

      if (!VALID_IDENTIFIER.test(agg.outputField)) {
        errors.push({
          code: "INVALID_IDENTIFIER",
          field: agg.outputField,
          message: `Output field name "${agg.outputField}" is not a valid identifier (must start with letter or underscore, contain only alphanumeric and underscore)`,
        });
      }
    }
  }

  /**
   * Check for duplicate output field names
   */
  private validateDuplicateOutputFields(
    config: TransformConfig,
    errors: TransformValidationError[]
  ): void {
    const prefix = config.outputFieldPrefix ?? "";
    const seen = new Set<string>();

    for (const agg of config.aggregations) {
      const outputField = prefix + agg.outputField;

      if (seen.has(outputField)) {
        errors.push({
          code: "DUPLICATE_OUTPUT_FIELD",
          field: outputField,
          message: `Duplicate output field name "${outputField}"`,
        });
      }
      seen.add(outputField);
    }
  }

  /**
   * Check if field exists in schema (supports nested paths)
   */
  private fieldExistsInSchema(
    fieldPath: string,
    schemaFieldNames: Set<string>,
    sourceSchema: FieldSchema[]
  ): boolean {
    // Direct match
    if (schemaFieldNames.has(fieldPath)) {
      return true;
    }

    // Check for nested path prefix match
    // e.g., "item.brand" might match "item" of type "object"
    const parts = fieldPath.split(".");
    if (parts.length > 1) {
      const rootField = parts[0];
      const rootSchema = sourceSchema.find((f) => f.name === rootField);
      if (rootSchema && rootSchema.type === "object") {
        return true;
      }
    }

    return false;
  }

  /**
   * Infer the output schema from the transform config
   */
  inferOutputSchema(
    config: TransformConfig,
    sourceSchema: FieldSchema[]
  ): FieldSchema[] {
    const outputSchema: FieldSchema[] = [];
    const prefix = config.outputFieldPrefix ?? "";

    // Add group key fields if included
    if (config.includeGroupKey) {
      const groupByFields = Array.isArray(config.groupBy)
        ? config.groupBy
        : [config.groupBy];

      for (const field of groupByFields) {
        const sourceField = sourceSchema.find((f) => f.name === field);
        outputSchema.push({
          name: field,
          type: sourceField?.type ?? "unknown",
        });
      }
    }

    // Add aggregation output fields
    for (const agg of config.aggregations) {
      const outputField = prefix + agg.outputField;
      const fieldSchema = this.inferAggregationOutputType(agg, sourceSchema);
      outputSchema.push({
        name: outputField,
        ...fieldSchema,
      });
    }

    return outputSchema;
  }

  /**
   * Infer the output type for an aggregation
   */
  private inferAggregationOutputType(
    agg: TransformConfig["aggregations"][0],
    sourceSchema: FieldSchema[]
  ): Omit<FieldSchema, "name"> {
    const sourceField = agg.sourceField
      ? sourceSchema.find((f) => f.name === agg.sourceField)
      : undefined;

    switch (agg.function) {
      case "COUNT":
      case "DISTINCT_COUNT":
      case "COUNT_IF":
        return { type: "number" };

      case "SUM":
        return { type: "number" };

      case "AVG":
        return { type: "number", nullable: true };

      case "MIN":
      case "MAX":
        // Preserves source type but can be null for empty groups
        return { type: sourceField?.type ?? "number", nullable: true };

      case "FIRST":
      case "LAST":
        // Preserves source type but can be null
        return { type: sourceField?.type ?? "unknown", nullable: true };

      case "CONCAT":
        return { type: "string" };

      case "COLLECT":
        return { type: "array" };

      default:
        return { type: "unknown" };
    }
  }
}
