import type { ColumnType } from "./data-normalizer.js";

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: ColumnType;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
}

export interface RowError {
  row: number;
  field: string;
  value: unknown;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: RowError[];
  errorsByField: Record<string, RowError[]>;
}

// Regex patterns for type validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/|www\.)[^\s]+$/i;
const DATE_REGEX =
  /^(\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})$/;

/**
 * Checks if a value is empty (null, undefined, or empty string)
 */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * Validates a value against a type
 */
function validateType(value: unknown, type: ColumnType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";

    case "number":
      return typeof value === "number" && !isNaN(value);

    case "boolean":
      return typeof value === "boolean";

    case "date":
      // Accept Date objects, valid date strings, or ISO strings
      if (value instanceof Date) {
        return !isNaN(value.getTime());
      }
      if (typeof value === "string") {
        // Check if it's a valid date string
        const date = new Date(value);
        return !isNaN(date.getTime()) || DATE_REGEX.test(value);
      }
      return false;

    case "url":
      return typeof value === "string" && URL_REGEX.test(value);

    case "email":
      return typeof value === "string" && EMAIL_REGEX.test(value);

    default:
      return true;
  }
}

/**
 * Validates a single row against validation rules
 */
export function validateRow(
  row: Record<string, unknown>,
  rowIndex: number,
  rules: ValidationRule[]
): RowError[] {
  const errors: RowError[] = [];

  for (const rule of rules) {
    const value = row[rule.field];

    // Check required
    if (rule.required && isEmpty(value)) {
      errors.push({
        row: rowIndex,
        field: rule.field,
        value,
        message: `Field "${rule.field}" is required`,
      });
      // Skip other validations for required fields that are empty
      continue;
    }

    // Skip further validation if value is empty and not required
    if (isEmpty(value)) {
      continue;
    }

    // Check type
    if (rule.type && !validateType(value, rule.type)) {
      errors.push({
        row: rowIndex,
        field: rule.field,
        value,
        message: `Field "${rule.field}" must be of type ${rule.type}`,
      });
    }

    // Check minLength (for strings)
    if (rule.minLength !== undefined && typeof value === "string") {
      if (value.length < rule.minLength) {
        errors.push({
          row: rowIndex,
          field: rule.field,
          value,
          message: `Field "${rule.field}" must be at least ${rule.minLength} characters`,
        });
      }
    }

    // Check maxLength (for strings)
    if (rule.maxLength !== undefined && typeof value === "string") {
      if (value.length > rule.maxLength) {
        errors.push({
          row: rowIndex,
          field: rule.field,
          value,
          message: `Field "${rule.field}" must be at most ${rule.maxLength} characters`,
        });
      }
    }

    // Check pattern (for strings)
    if (rule.pattern && typeof value === "string") {
      if (!rule.pattern.test(value)) {
        errors.push({
          row: rowIndex,
          field: rule.field,
          value,
          message: `Field "${rule.field}" does not match required pattern`,
        });
      }
    }

    // Check custom validation
    if (rule.custom && !rule.custom(value)) {
      errors.push({
        row: rowIndex,
        field: rule.field,
        value,
        message: `Field "${rule.field}" failed custom validation`,
      });
    }
  }

  return errors;
}

/**
 * Validates all rows against validation rules
 */
export function validateRows(
  rows: Record<string, unknown>[],
  rules: ValidationRule[]
): ValidationResult {
  const allErrors: RowError[] = [];
  const errorsByField: Record<string, RowError[]> = {};
  let invalidRowCount = 0;
  const invalidRowIndices = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const rowErrors = validateRow(row, i, rules);

    if (rowErrors.length > 0) {
      if (!invalidRowIndices.has(i)) {
        invalidRowCount++;
        invalidRowIndices.add(i);
      }

      for (const error of rowErrors) {
        allErrors.push(error);

        // Group by field
        if (!errorsByField[error.field]) {
          errorsByField[error.field] = [];
        }
        errorsByField[error.field]!.push(error);
      }
    }
  }

  return {
    valid: allErrors.length === 0,
    totalRows: rows.length,
    validRows: rows.length - invalidRowCount,
    invalidRows: invalidRowCount,
    errors: allErrors,
    errorsByField,
  };
}
