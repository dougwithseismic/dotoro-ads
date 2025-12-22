/**
 * Aggregation Functions Executor
 *
 * Implements all supported aggregation operations for data transforms.
 */

import type {
  AggregationFunction,
  AggregationOptions,
  ConditionConfig,
} from "./types.js";

/**
 * Executes aggregation functions on arrays of values
 */
export class AggregationExecutor {
  /**
   * Execute an aggregation function on a set of values
   */
  execute(
    fn: AggregationFunction,
    values: unknown[],
    options?: AggregationOptions
  ): unknown {
    switch (fn) {
      case "COUNT":
        return this.count(values, options?.distinct);

      case "SUM":
        return this.sum(values);

      case "MIN":
        return this.min(values);

      case "MAX":
        return this.max(values);

      case "AVG":
        return this.avg(values);

      case "FIRST":
        return this.first(values);

      case "LAST":
        return this.last(values);

      case "CONCAT":
        return this.concat(values, options?.separator);

      case "COLLECT":
        return this.collect(values, options?.limit);

      case "DISTINCT_COUNT":
        return this.distinctCount(values);

      case "COUNT_IF":
        return this.countIf(values, options?.condition);

      default:
        throw new Error(`Unknown aggregation function: ${fn}`);
    }
  }

  /**
   * Count values in array
   * When distinct is true, only counts unique values
   */
  private count(values: unknown[], distinct?: boolean): number {
    if (distinct) {
      return this.distinctCount(values);
    }
    return values.length;
  }

  /**
   * Sum numeric values
   * Filters out non-numeric values and attempts to parse strings
   */
  private sum(values: unknown[]): number {
    let total = 0;
    for (const value of values) {
      const num = this.toNumber(value);
      if (num !== null) {
        total += num;
      }
    }
    return total;
  }

  /**
   * Find minimum value
   * Returns null for empty arrays or when all values are null/undefined
   */
  private min(values: unknown[]): number | string | null {
    const filtered = this.filterNullish(values);
    if (filtered.length === 0) {
      return null;
    }

    // Check if all values are numeric or string-numeric
    const numericValues: number[] = [];
    let allNumeric = true;

    for (const value of filtered) {
      const num = this.toNumber(value);
      if (num !== null) {
        numericValues.push(num);
      } else if (typeof value === "string") {
        allNumeric = false;
      }
    }

    // If all values are numeric, compare as numbers
    if (allNumeric && numericValues.length > 0) {
      return numericValues.reduce((min, val) => val < min ? val : min, numericValues[0]!);
    }

    // If we have numeric values, return the minimum
    if (numericValues.length > 0) {
      return numericValues.reduce((min, val) => val < min ? val : min, numericValues[0]!);
    }

    // Otherwise, compare as strings using reduce to avoid stack overflow
    const stringValues = filtered.map((v) => String(v));
    return stringValues.reduce((min, val) => val < min ? val : min, stringValues[0]!) ?? null;
  }

  /**
   * Find maximum value
   * Returns null for empty arrays or when all values are null/undefined
   */
  private max(values: unknown[]): number | string | null {
    const filtered = this.filterNullish(values);
    if (filtered.length === 0) {
      return null;
    }

    // Check if all values are numeric or string-numeric
    const numericValues: number[] = [];
    let allNumeric = true;

    for (const value of filtered) {
      const num = this.toNumber(value);
      if (num !== null) {
        numericValues.push(num);
      } else if (typeof value === "string") {
        allNumeric = false;
      }
    }

    // If all values are numeric, compare as numbers
    if (allNumeric && numericValues.length > 0) {
      return numericValues.reduce((max, val) => val > max ? val : max, numericValues[0]!);
    }

    // If we have numeric values, return the maximum
    if (numericValues.length > 0) {
      return numericValues.reduce((max, val) => val > max ? val : max, numericValues[0]!);
    }

    // Otherwise, compare as strings using reduce to avoid stack overflow
    const stringValues = filtered.map((v) => String(v));
    return stringValues.reduce((max, val) => val > max ? val : max, stringValues[0]!) ?? null;
  }

  /**
   * Calculate average of numeric values
   * Returns null for empty arrays or when no numeric values exist
   */
  private avg(values: unknown[]): number | null {
    const numericValues: number[] = [];
    for (const value of values) {
      const num = this.toNumber(value);
      if (num !== null) {
        numericValues.push(num);
      }
    }

    if (numericValues.length === 0) {
      return null;
    }

    const total = numericValues.reduce((sum, n) => sum + n, 0);
    return total / numericValues.length;
  }

  /**
   * Get first non-null/undefined value
   */
  private first(values: unknown[]): unknown {
    for (const value of values) {
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return null;
  }

  /**
   * Get last non-null/undefined value
   */
  private last(values: unknown[]): unknown {
    for (let i = values.length - 1; i >= 0; i--) {
      const value = values[i];
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return null;
  }

  /**
   * Concatenate values as strings
   * Filters out null/undefined values
   */
  private concat(values: unknown[], separator?: string): string {
    const sep = separator ?? ", ";
    const filtered = this.filterNullish(values);
    return filtered.map((v) => String(v)).join(sep);
  }

  /**
   * Collect all non-null/undefined values into an array
   * Optionally limits the number of collected items
   */
  private collect(values: unknown[], limit?: number): unknown[] {
    const filtered = this.filterNullish(values);
    if (limit !== undefined && limit > 0) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }

  /**
   * Count distinct non-null/undefined values
   */
  private distinctCount(values: unknown[]): number {
    const filtered = this.filterNullish(values);
    const unique = new Set<string>();

    for (const value of filtered) {
      // Use JSON.stringify for complex objects, primitive toString otherwise
      const key =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      unique.add(key);
    }

    return unique.size;
  }

  /**
   * Count values matching a condition
   * Values should be objects with fields matching the condition
   */
  private countIf(
    values: unknown[],
    condition?: ConditionConfig
  ): number {
    if (!condition) {
      return 0;
    }

    let count = 0;
    for (const value of values) {
      if (this.evaluateCondition(value, condition)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Evaluate a condition against a value (which should be an object)
   */
  private evaluateCondition(
    value: unknown,
    condition: ConditionConfig
  ): boolean {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const record = value as Record<string, unknown>;
    const fieldValue = record[condition.field];

    switch (condition.operator) {
      case "equals":
        return this.compareEquals(fieldValue, condition.value);

      case "not_equals":
        return !this.compareEquals(fieldValue, condition.value);

      case "greater_than":
        return this.compareNumeric(fieldValue, condition.value, "gt");

      case "less_than":
        return this.compareNumeric(fieldValue, condition.value, "lt");

      case "greater_than_or_equal":
        return this.compareNumeric(fieldValue, condition.value, "gte");

      case "less_than_or_equal":
        return this.compareNumeric(fieldValue, condition.value, "lte");

      case "contains":
        return this.compareContains(fieldValue, condition.value);

      case "not_contains":
        return !this.compareContains(fieldValue, condition.value);

      case "starts_with":
        return this.compareStartsWith(fieldValue, condition.value);

      case "ends_with":
        return this.compareEndsWith(fieldValue, condition.value);

      case "in":
        return this.compareIn(fieldValue, condition.value);

      case "not_in":
        return !this.compareIn(fieldValue, condition.value);

      case "is_empty":
        return this.isEmpty(fieldValue);

      case "is_not_empty":
        return !this.isEmpty(fieldValue);

      default:
        console.error(
          `Unknown condition operator "${condition.operator}" for field "${condition.field}". ` +
          `Valid operators: equals, not_equals, greater_than, less_than, ` +
          `greater_than_or_equal, less_than_or_equal, contains, not_contains, ` +
          `starts_with, ends_with, in, not_in, is_empty, is_not_empty`
        );
        return false;
    }
  }

  /**
   * Compare equality (case-insensitive for strings)
   */
  private compareEquals(fieldValue: unknown, conditionValue: unknown): boolean {
    if (fieldValue === conditionValue) {
      return true;
    }

    // String comparison (case-insensitive)
    if (typeof fieldValue === "string" && typeof conditionValue === "string") {
      return fieldValue.toLowerCase() === conditionValue.toLowerCase();
    }

    // Numeric comparison with string parsing
    const fieldNum = this.toNumber(fieldValue);
    const conditionNum = this.toNumber(conditionValue);
    if (fieldNum !== null && conditionNum !== null) {
      return fieldNum === conditionNum;
    }

    return false;
  }

  /**
   * Numeric comparison
   */
  private compareNumeric(
    fieldValue: unknown,
    conditionValue: unknown,
    operator: "gt" | "lt" | "gte" | "lte"
  ): boolean {
    const fieldNum = this.toNumber(fieldValue);
    const conditionNum = this.toNumber(conditionValue);

    if (fieldNum === null || conditionNum === null) {
      return false;
    }

    switch (operator) {
      case "gt":
        return fieldNum > conditionNum;
      case "lt":
        return fieldNum < conditionNum;
      case "gte":
        return fieldNum >= conditionNum;
      case "lte":
        return fieldNum <= conditionNum;
    }
  }

  /**
   * Contains comparison (case-insensitive)
   */
  private compareContains(
    fieldValue: unknown,
    conditionValue: unknown
  ): boolean {
    const fieldStr = String(fieldValue ?? "").toLowerCase();
    const conditionStr = String(conditionValue ?? "").toLowerCase();
    return fieldStr.includes(conditionStr);
  }

  /**
   * Starts with comparison (case-insensitive)
   */
  private compareStartsWith(
    fieldValue: unknown,
    conditionValue: unknown
  ): boolean {
    const fieldStr = String(fieldValue ?? "").toLowerCase();
    const conditionStr = String(conditionValue ?? "").toLowerCase();
    return fieldStr.startsWith(conditionStr);
  }

  /**
   * Ends with comparison (case-insensitive)
   */
  private compareEndsWith(
    fieldValue: unknown,
    conditionValue: unknown
  ): boolean {
    const fieldStr = String(fieldValue ?? "").toLowerCase();
    const conditionStr = String(conditionValue ?? "").toLowerCase();
    return fieldStr.endsWith(conditionStr);
  }

  /**
   * In array comparison
   */
  private compareIn(fieldValue: unknown, conditionValue: unknown): boolean {
    if (!Array.isArray(conditionValue)) {
      return this.compareEquals(fieldValue, conditionValue);
    }
    return conditionValue.some((cv) => this.compareEquals(fieldValue, cv));
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === "string") {
      return value.trim() === "";
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  }

  /**
   * Filter out null and undefined values
   */
  private filterNullish(values: unknown[]): unknown[] {
    return values.filter((v) => v !== null && v !== undefined);
  }

  /**
   * Convert value to number, returning null if not numeric
   */
  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "number") {
      return isNaN(value) ? null : value;
    }
    if (typeof value === "string") {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    return null;
  }
}
