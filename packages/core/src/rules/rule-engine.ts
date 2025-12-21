/**
 * Rule Evaluation Engine
 *
 * Evaluates rules against data rows and applies actions to matching rows.
 * Supports all operators defined in condition-schema.ts.
 */

import type {
  Condition,
  ConditionGroup,
  Rule,
  Action,
  Operator,
  ConditionValue,
} from "./condition-schema.js";
import { isCondition, isConditionGroup } from "./condition-schema.js";
import { ActionExecutor, type AppliedAction } from "./actions.js";

/**
 * Result of processing a single row through the rule engine
 */
export interface ProcessedRow {
  originalRow: Record<string, unknown>;
  matchedRules: Rule[];
  actions: AppliedAction[];
  shouldSkip: boolean;
  modifiedRow: Record<string, unknown>;
  groups: string[];
  tags: string[];
  targeting: Record<string, unknown>;
}

/**
 * Options for the rule engine
 */
export interface RuleEngineOptions {
  /** Case-insensitive string comparison (default: true) */
  caseInsensitive?: boolean;
  /** Maximum regex execution time in ms (default: 100) */
  regexTimeout?: number;
  /** Maximum regex pattern length (default: 100) */
  maxRegexLength?: number;
}

const DEFAULT_OPTIONS: Required<RuleEngineOptions> = {
  caseInsensitive: true,
  regexTimeout: 100,
  maxRegexLength: 100,
};

/**
 * Patterns that indicate potential catastrophic backtracking (ReDoS)
 */
const NESTED_QUANTIFIERS = /\([^)]*[+*][^)]*\)[+*?]/;
const OVERLAPPING_ALTERNATION = /\([^|)]*\|[^|)]*\)[+*]/;
const OPTIONAL_REPETITION = /\([^)]*\?\)[+*]/;
const LONG_QUANTIFIER_CHAIN = /[+*]{2,}/;

/**
 * Rule Engine for evaluating conditions and applying actions
 */
export class RuleEngine {
  private options: Required<RuleEngineOptions>;
  private actionExecutor: ActionExecutor;

  constructor(options?: RuleEngineOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.actionExecutor = new ActionExecutor();
  }

  /**
   * Evaluate a single condition against a data row
   */
  evaluateCondition(
    condition: Condition,
    row: Record<string, unknown>
  ): boolean {
    const fieldValue = row[condition.field];
    const conditionValue = condition.value;

    return this.evaluateOperator(
      condition.operator,
      fieldValue,
      conditionValue
    );
  }

  /**
   * Evaluate an operator with field and condition values
   */
  private evaluateOperator(
    operator: Operator,
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    switch (operator) {
      case "equals":
        return this.evaluateEquals(fieldValue, conditionValue);

      case "not_equals":
        return !this.evaluateEquals(fieldValue, conditionValue);

      case "contains":
        return this.evaluateContains(fieldValue, conditionValue);

      case "not_contains":
        return !this.evaluateContains(fieldValue, conditionValue);

      case "starts_with":
        return this.evaluateStartsWith(fieldValue, conditionValue);

      case "ends_with":
        return this.evaluateEndsWith(fieldValue, conditionValue);

      case "greater_than":
        return this.evaluateGreaterThan(fieldValue, conditionValue);

      case "less_than":
        return this.evaluateLessThan(fieldValue, conditionValue);

      case "greater_than_or_equal":
        return this.evaluateGreaterThanOrEqual(fieldValue, conditionValue);

      case "less_than_or_equal":
        return this.evaluateLessThanOrEqual(fieldValue, conditionValue);

      case "regex":
        return this.evaluateRegex(fieldValue, conditionValue);

      case "in":
        return this.evaluateIn(fieldValue, conditionValue);

      case "not_in":
        return !this.evaluateIn(fieldValue, conditionValue);

      case "is_empty":
        return this.evaluateIsEmpty(fieldValue);

      case "is_not_empty":
        return !this.evaluateIsEmpty(fieldValue);

      default:
        console.warn(`Unknown operator "${operator}" in rule condition - treating as non-match`);
        return false;
    }
  }

  /**
   * Convert value to string for comparison
   */
  private toString(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }

  /**
   * Convert value to number for comparison
   */
  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "number") {
      return value;
    }
    const num = parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  /**
   * Normalize string for comparison (handles case sensitivity)
   */
  private normalizeString(value: string): string {
    return this.options.caseInsensitive ? value.toLowerCase() : value;
  }

  /**
   * Equals comparison (case-insensitive for strings)
   */
  private evaluateEquals(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    // Handle null/undefined
    if (fieldValue === null || fieldValue === undefined) {
      return conditionValue === "" || conditionValue === null;
    }

    // Boolean comparison
    if (typeof conditionValue === "boolean") {
      if (typeof fieldValue === "boolean") {
        return fieldValue === conditionValue;
      }
      // Convert string to boolean
      const strValue = this.toString(fieldValue).toLowerCase();
      return conditionValue === (strValue === "true" || strValue === "1");
    }

    // Numeric comparison
    if (typeof conditionValue === "number") {
      const numValue = this.toNumber(fieldValue);
      return numValue !== null && numValue === conditionValue;
    }

    // String comparison (case-insensitive by default)
    const strField = this.normalizeString(this.toString(fieldValue));
    const strCondition = this.normalizeString(String(conditionValue));
    return strField === strCondition;
  }

  /**
   * Contains - substring match
   */
  private evaluateContains(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const strField = this.normalizeString(this.toString(fieldValue));
    const strCondition = this.normalizeString(String(conditionValue));
    return strField.includes(strCondition);
  }

  /**
   * Starts with - prefix match
   */
  private evaluateStartsWith(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const strField = this.normalizeString(this.toString(fieldValue));
    const strCondition = this.normalizeString(String(conditionValue));
    return strField.startsWith(strCondition);
  }

  /**
   * Ends with - suffix match
   */
  private evaluateEndsWith(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const strField = this.normalizeString(this.toString(fieldValue));
    const strCondition = this.normalizeString(String(conditionValue));
    return strField.endsWith(strCondition);
  }

  /**
   * Greater than - numeric comparison
   */
  private evaluateGreaterThan(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const numField = this.toNumber(fieldValue);
    const numCondition = this.toNumber(conditionValue);
    if (numField === null || numCondition === null) {
      return false;
    }
    return numField > numCondition;
  }

  /**
   * Less than - numeric comparison
   */
  private evaluateLessThan(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const numField = this.toNumber(fieldValue);
    const numCondition = this.toNumber(conditionValue);
    if (numField === null || numCondition === null) {
      return false;
    }
    return numField < numCondition;
  }

  /**
   * Greater than or equal - numeric comparison
   */
  private evaluateGreaterThanOrEqual(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const numField = this.toNumber(fieldValue);
    const numCondition = this.toNumber(conditionValue);
    if (numField === null || numCondition === null) {
      return false;
    }
    return numField >= numCondition;
  }

  /**
   * Less than or equal - numeric comparison
   */
  private evaluateLessThanOrEqual(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    const numField = this.toNumber(fieldValue);
    const numCondition = this.toNumber(conditionValue);
    if (numField === null || numCondition === null) {
      return false;
    }
    return numField <= numCondition;
  }

  /**
   * Validate regex pattern for safety (ReDoS prevention)
   */
  private isRegexSafe(pattern: string): { safe: boolean; reason?: string } {
    // Check length
    if (pattern.length > this.options.maxRegexLength) {
      return { safe: false, reason: "Pattern exceeds maximum length" };
    }

    // ReDoS pattern checks
    const checks = [
      { pattern: NESTED_QUANTIFIERS, reason: "Nested quantifiers detected" },
      {
        pattern: OVERLAPPING_ALTERNATION,
        reason: "Overlapping alternation detected",
      },
      {
        pattern: OPTIONAL_REPETITION,
        reason: "Repetition of optional group detected",
      },
      {
        pattern: LONG_QUANTIFIER_CHAIN,
        reason: "Multiple consecutive quantifiers detected",
      },
    ];

    for (const check of checks) {
      if (check.pattern.test(pattern)) {
        return { safe: false, reason: check.reason };
      }
    }

    // Try to compile
    try {
      new RegExp(pattern);
      return { safe: true };
    } catch {
      return { safe: false, reason: "Invalid regex syntax" };
    }
  }

  /**
   * Regex match with safety checks
   */
  private evaluateRegex(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    if (typeof conditionValue !== "string") {
      return false;
    }

    // Validate regex safety
    const safetyCheck = this.isRegexSafe(conditionValue);
    if (!safetyCheck.safe) {
      console.warn(`Regex pattern "${conditionValue}" rejected: ${safetyCheck.reason}`);
      return false;
    }

    try {
      const flags = this.options.caseInsensitive ? "i" : "";
      const regex = new RegExp(conditionValue, flags);
      const strField = this.toString(fieldValue);
      return regex.test(strField);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(`Regex execution failed for pattern "${conditionValue}": ${message}`);
      return false;
    }
  }

  /**
   * In - value is in array
   */
  private evaluateIn(
    fieldValue: unknown,
    conditionValue: ConditionValue
  ): boolean {
    if (!Array.isArray(conditionValue)) {
      // If not an array, treat as single value
      return this.evaluateEquals(fieldValue, conditionValue);
    }

    return conditionValue.some((cv) => this.evaluateEquals(fieldValue, cv));
  }

  /**
   * Is empty - null/undefined/empty string check
   */
  private evaluateIsEmpty(fieldValue: unknown): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return true;
    }
    if (typeof fieldValue === "string") {
      return fieldValue.trim() === "";
    }
    if (Array.isArray(fieldValue)) {
      return fieldValue.length === 0;
    }
    return false;
  }

  /**
   * Evaluate a condition group (handles nested AND/OR logic)
   */
  evaluateConditionGroup(
    group: ConditionGroup,
    row: Record<string, unknown>
  ): boolean {
    if (group.conditions.length === 0) {
      return true; // Empty group matches everything
    }

    if (group.logic === "AND") {
      return group.conditions.every((item) => this.evaluateItem(item, row));
    } else {
      return group.conditions.some((item) => this.evaluateItem(item, row));
    }
  }

  /**
   * Evaluate a single item (condition or group)
   */
  private evaluateItem(
    item: Condition | ConditionGroup,
    row: Record<string, unknown>
  ): boolean {
    if (isCondition(item)) {
      return this.evaluateCondition(item, row);
    } else if (isConditionGroup(item)) {
      return this.evaluateConditionGroup(item, row);
    }
    return false;
  }

  /**
   * Evaluate all rules against a single row, return matching rules
   * Rules are evaluated in priority order (lower priority number = higher priority)
   */
  evaluateRules(rules: Rule[], row: Record<string, unknown>): Rule[] {
    // Filter to enabled rules and sort by priority
    const enabledRules = rules
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    return enabledRules.filter((rule) =>
      this.evaluateConditionGroup(rule.conditionGroup, row)
    );
  }

  /**
   * Process a single row with a set of rules
   */
  processRow(rules: Rule[], row: Record<string, unknown>): ProcessedRow {
    const matchedRules = this.evaluateRules(rules, row);
    const allActions: AppliedAction[] = [];
    let modifiedRow = { ...row };
    let shouldSkip = false;
    const groups: string[] = [];
    const tags: string[] = [];
    let targeting: Record<string, unknown> = {};

    // Collect all actions from matched rules
    for (const rule of matchedRules) {
      for (const action of rule.actions) {
        const result = this.actionExecutor.execute(action, modifiedRow);
        allActions.push(result);

        if (result.success) {
          // Apply the action results
          if (result.modifiedRow) {
            modifiedRow = result.modifiedRow;
          }
          if (result.shouldSkip) {
            shouldSkip = true;
          }
          if (result.group) {
            if (!groups.includes(result.group)) {
              groups.push(result.group);
            }
          }
          if (result.removeGroup) {
            const idx = groups.indexOf(result.removeGroup);
            if (idx !== -1) {
              groups.splice(idx, 1);
            }
          }
          if (result.tag) {
            if (!tags.includes(result.tag)) {
              tags.push(result.tag);
            }
          }
          if (result.targeting) {
            targeting = { ...targeting, ...result.targeting };
          }
        }
      }
    }

    return {
      originalRow: row,
      matchedRules,
      actions: allActions,
      shouldSkip,
      modifiedRow,
      groups,
      tags,
      targeting,
    };
  }

  /**
   * Process a dataset with rules, return results with actions applied
   */
  processDataset(
    rules: Rule[],
    rows: Record<string, unknown>[]
  ): ProcessedRow[] {
    return rows.map((row) => this.processRow(rules, row));
  }

  /**
   * Get count of rows that match a condition group
   */
  countMatches(
    conditionGroup: ConditionGroup,
    rows: Record<string, unknown>[]
  ): number {
    return rows.filter((row) =>
      this.evaluateConditionGroup(conditionGroup, row)
    ).length;
  }

  /**
   * Test a single rule against sample data and return detailed results
   */
  testRule(
    rule: Rule,
    sampleData: Record<string, unknown>[]
  ): {
    totalRows: number;
    matchedRows: number;
    results: Array<{
      row: Record<string, unknown>;
      matched: boolean;
      actions: AppliedAction[];
      modifiedRow: Record<string, unknown>;
    }>;
  } {
    const results = sampleData.map((row) => {
      const matched = this.evaluateConditionGroup(rule.conditionGroup, row);
      const processedRow = matched
        ? this.processRow([rule], row)
        : {
            modifiedRow: row,
            actions: [] as AppliedAction[],
          };

      return {
        row,
        matched,
        actions: processedRow.actions,
        modifiedRow: processedRow.modifiedRow,
      };
    });

    return {
      totalRows: sampleData.length,
      matchedRows: results.filter((r) => r.matched).length,
      results,
    };
  }
}
