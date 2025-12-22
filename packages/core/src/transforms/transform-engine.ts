/**
 * Transform Engine
 *
 * Groups and aggregates data rows based on transform configuration.
 * Supports single and multi-field grouping, nested field access,
 * and all aggregation functions.
 */

import type { AggregationExecutor } from "./aggregations.js";
import type {
  TransformConfig,
  TransformResult,
  TransformError,
  TransformWarning,
  AggregationConfig,
} from "./types.js";

/**
 * Transform Engine for grouping and aggregating data
 */
export class TransformEngine {
  constructor(private aggregationExecutor: AggregationExecutor) {}

  /**
   * Execute a transform on source data
   */
  execute(
    config: TransformConfig,
    sourceRows: Record<string, unknown>[]
  ): TransformResult {
    const errors: TransformError[] = [];
    const warnings: TransformWarning[] = [];

    if (sourceRows.length === 0) {
      return {
        rows: [],
        groupCount: 0,
        sourceRowCount: 0,
        errors,
        warnings,
      };
    }

    // Validate that aggregations are not empty
    if (!config.aggregations || config.aggregations.length === 0) {
      errors.push({
        type: "error",
        code: "NO_AGGREGATIONS",
        message: "Transform config must have at least one aggregation",
      });
      return {
        rows: [],
        groupCount: 0,
        sourceRowCount: sourceRows.length,
        errors,
        warnings,
      };
    }

    // Check for missing sourceField in aggregations that require it
    const fieldsRequiringSource = ["SUM", "MIN", "MAX", "AVG", "FIRST", "LAST", "CONCAT", "COLLECT", "DISTINCT_COUNT"];
    for (const agg of config.aggregations) {
      if (fieldsRequiringSource.includes(agg.function) && !agg.sourceField) {
        warnings.push({
          type: "warning",
          code: "MISSING_SOURCE_FIELD",
          message: `Aggregation "${agg.function}" for output "${agg.outputField}" has no sourceField - will use undefined values`,
          field: agg.outputField,
        });
      }
    }

    // Track if any aggregation accesses a non-existent field
    const existingFields = this.collectFieldNames(sourceRows);

    for (const agg of config.aggregations) {
      if (agg.sourceField && !this.fieldExists(agg.sourceField, existingFields, sourceRows)) {
        warnings.push({
          type: "warning",
          code: "FIELD_NOT_FOUND",
          message: `Source field "${agg.sourceField}" not found in data - will result in empty values`,
          field: agg.sourceField,
        });
      }
    }

    // Group rows
    const groups = this.groupRows(sourceRows, config.groupBy);

    // Aggregate each group
    const outputRows: Record<string, unknown>[] = [];

    for (const [groupKey, groupRows] of groups) {
      const aggregatedRow = this.aggregateGroup(groupKey, groupRows, config);
      outputRows.push(aggregatedRow);
    }

    return {
      rows: outputRows,
      groupCount: groups.size,
      sourceRowCount: sourceRows.length,
      errors,
      warnings,
    };
  }

  /**
   * Preview a transform with limited output rows
   */
  preview(
    config: TransformConfig,
    sourceRows: Record<string, unknown>[],
    limit = 10
  ): TransformResult {
    const result = this.execute(config, sourceRows);

    // Limit output rows
    if (result.rows.length > limit) {
      result.rows = result.rows.slice(0, limit);
      result.groupCount = limit;
    }

    return result;
  }

  /**
   * Group rows by one or more fields
   */
  private groupRows(
    rows: Record<string, unknown>[],
    groupBy: string | string[]
  ): Map<string, Record<string, unknown>[]> {
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const row of rows) {
      const groupKey = this.buildGroupKey(row, groupBy);
      const existing = groups.get(groupKey);

      if (existing) {
        existing.push(row);
      } else {
        groups.set(groupKey, [row]);
      }
    }

    return groups;
  }

  /**
   * Build a group key from row values
   * Uses JSON encoding for composite keys to handle values containing special characters
   */
  private buildGroupKey(
    row: Record<string, unknown>,
    groupBy: string | string[]
  ): string {
    const fields = Array.isArray(groupBy) ? groupBy : [groupBy];
    const keyParts = fields.map(field => {
      const value = this.getFieldValue(row, field);
      return value === null || value === undefined ? "" : String(value);
    });
    return JSON.stringify(keyParts);
  }

  /**
   * Aggregate values for a group
   */
  private aggregateGroup(
    groupKey: string,
    groupRows: Record<string, unknown>[],
    config: TransformConfig
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const prefix = config.outputFieldPrefix ?? "";

    // Include group key values if requested
    if (config.includeGroupKey) {
      const groupByFields = Array.isArray(config.groupBy)
        ? config.groupBy
        : [config.groupBy];

      let keyParts: string[];
      try {
        keyParts = JSON.parse(groupKey) as string[];
      } catch (parseError) {
        throw new Error(
          `Failed to parse group key "${groupKey.substring(0, 100)}${groupKey.length > 100 ? '...' : ''}" - ` +
          `this may indicate data corruption or encoding issues. ` +
          `Original error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      for (let i = 0; i < groupByFields.length; i++) {
        const field = groupByFields[i];
        let keyValue: unknown = keyParts[i];

        // Convert empty string back to appropriate value from first row
        if (keyValue === "" && groupRows.length > 0) {
          keyValue = this.getFieldValue(groupRows[0]!, field!);
        }

        if (field) {
          result[field] = keyValue;
        }
      }
    }

    // Apply each aggregation
    for (const agg of config.aggregations) {
      const outputField = prefix + agg.outputField;
      const values = this.extractValues(groupRows, agg);
      const aggregatedValue = this.executeAggregation(agg, values, groupRows);
      result[outputField] = aggregatedValue;
    }

    return result;
  }

  /**
   * Extract values from rows for aggregation
   */
  private extractValues(
    rows: Record<string, unknown>[],
    agg: AggregationConfig
  ): unknown[] {
    // COUNT without sourceField counts all rows
    if (agg.function === "COUNT" && !agg.sourceField) {
      return rows;
    }

    // COUNT_IF operates on entire row objects
    if (agg.function === "COUNT_IF") {
      return rows;
    }

    // Other aggregations need a source field
    if (!agg.sourceField) {
      return [];
    }

    return rows.map((row) => this.getFieldValue(row, agg.sourceField!));
  }

  /**
   * Execute an aggregation function
   */
  private executeAggregation(
    agg: AggregationConfig,
    values: unknown[],
    rows: Record<string, unknown>[]
  ): unknown {
    // Special handling for COUNT without sourceField
    if (agg.function === "COUNT" && !agg.sourceField) {
      if (agg.options?.distinct && agg.sourceField) {
        return this.aggregationExecutor.execute(
          "COUNT",
          values,
          agg.options
        );
      }
      return rows.length;
    }

    // COUNT_IF needs row objects
    if (agg.function === "COUNT_IF") {
      return this.aggregationExecutor.execute("COUNT_IF", rows, agg.options);
    }

    return this.aggregationExecutor.execute(agg.function, values, agg.options);
  }

  /**
   * Get a field value from a row, supporting dot notation for nested access
   */
  private getFieldValue(
    row: Record<string, unknown>,
    fieldPath: string
  ): unknown {
    // First check if the exact path exists as a key
    if (fieldPath in row) {
      return row[fieldPath];
    }

    // Try nested access via dot notation
    const parts = fieldPath.split(".");
    let current: unknown = row;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== "object") {
        return undefined;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Collect all field names from sample rows (including nested paths)
   */
  private collectFieldNames(rows: Record<string, unknown>[]): Set<string> {
    const fields = new Set<string>();

    const collectFromObject = (
      obj: Record<string, unknown>,
      prefix: string
    ): void => {
      for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.add(fullPath);

        const value = obj[key];
        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          collectFromObject(value as Record<string, unknown>, fullPath);
        }
      }
    };

    // Sample a few rows to collect field names
    const sampleCount = Math.min(rows.length, 10);
    for (let i = 0; i < sampleCount; i++) {
      const row = rows[i];
      if (row) {
        collectFromObject(row, "");
      }
    }

    return fields;
  }

  /**
   * Check if a field exists in the data
   */
  private fieldExists(
    fieldPath: string,
    existingFields: Set<string>,
    rows: Record<string, unknown>[]
  ): boolean {
    // Direct match
    if (existingFields.has(fieldPath)) {
      return true;
    }

    // Try to access the field in first row
    if (rows.length > 0) {
      const value = this.getFieldValue(rows[0]!, fieldPath);
      return value !== undefined;
    }

    return false;
  }
}
