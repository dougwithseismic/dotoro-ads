export type ColumnType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "url"
  | "email";

export interface ColumnAnalysis {
  originalName: string;
  suggestedName: string;
  detectedType: ColumnType;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

export interface NormalizationResult {
  columns: ColumnAnalysis[];
  normalizedRows: Record<string, unknown>[];
}

// Regex patterns for type detection
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/|www\.)[^\s]+$/i;
// ISO format (unambiguous): 2024-01-15 or 2024-01-15T10:30:00
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
// US format: 01/15/2024 (month first, uses /)
const US_DATE_REGEX = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
// EU format: 15-01-2024 or 15.01.2024 (day first, uses - or .)
const EU_DATE_REGEX = /^\d{1,2}[-\.]\d{1,2}[-\.]\d{4}$/;
const TEXT_DATE_REGEX = /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/;
const NUMBER_REGEX = /^-?[\d,]+\.?\d*%?$/;
const CURRENCY_REGEX = /^\$[\d,]+\.?\d*$/;

/**
 * Normalizes a column name to snake_case
 */
export function normalizeColumnName(name: string): string {
  if (!name.trim()) {
    return "column";
  }

  let result = name.trim();

  // Handle camelCase and PascalCase - insert underscore before uppercase letters
  // But handle consecutive capitals (like "XMLParser" -> "xml_parser")
  result = result.replace(/([a-z\d])([A-Z])/g, "$1_$2");
  result = result.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2");

  // Convert to lowercase
  result = result.toLowerCase();

  // Replace hyphens and spaces with underscores
  result = result.replace(/[-\s]+/g, "_");

  // Remove special characters except underscores
  result = result.replace(/[^a-z0-9_]/g, "");

  // Collapse multiple underscores
  result = result.replace(/_+/g, "_");

  // Remove trailing underscores (but keep leading ones if needed for numbers)
  result = result.replace(/_+$/g, "");

  // Handle numbers at start - prefix with underscore
  if (/^\d/.test(result)) {
    result = "_" + result;
  }

  // Remove leading underscores ONLY if not followed by a digit
  result = result.replace(/^_+(?!\d)/, "");

  // Handle empty result after cleaning
  if (!result) {
    return "column";
  }

  return result;
}

/**
 * Checks if a value looks like an email
 */
function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

/**
 * Checks if a value looks like a URL
 */
function isUrl(value: string): boolean {
  return URL_REGEX.test(value);
}

/**
 * Checks if a value looks like a date
 */
function isDate(value: string): boolean {
  return (
    ISO_DATE_REGEX.test(value) ||
    US_DATE_REGEX.test(value) ||
    EU_DATE_REGEX.test(value) ||
    TEXT_DATE_REGEX.test(value)
  );
}

/**
 * Checks if a value looks like a boolean
 */
function isBoolean(value: string): boolean {
  const lower = value.toLowerCase();
  return ["true", "false", "yes", "no", "1", "0"].includes(lower);
}

/**
 * Checks if a value looks like a number
 */
function isNumber(value: string): boolean {
  // Remove currency symbol and percentage for checking
  const cleaned = value.replace(/^\$/, "").replace(/%$/, "");
  return NUMBER_REGEX.test(cleaned) || CURRENCY_REGEX.test(value);
}

/**
 * Detects the column type from sample values
 * Requires at least 70% of non-empty values to match the type
 */
export function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v.trim() !== "");

  if (nonEmpty.length === 0) {
    return "string";
  }

  // Count matches for each type
  let emailCount = 0;
  let urlCount = 0;
  let dateCount = 0;
  let booleanCount = 0;
  let numberCount = 0;

  for (const value of nonEmpty) {
    if (isEmail(value)) emailCount++;
    if (isUrl(value)) urlCount++;
    if (isDate(value)) dateCount++;
    if (isBoolean(value)) booleanCount++;
    if (isNumber(value)) numberCount++;
  }

  const threshold = Math.ceil(nonEmpty.length * 0.7);

  // Check types in order of specificity
  if (emailCount >= threshold) return "email";
  if (urlCount >= threshold) return "url";
  if (dateCount >= threshold) return "date";

  // Special case: if ALL values are 1 or 0, treat as boolean
  const allBinaryDigits = nonEmpty.every((v) => v === "1" || v === "0");
  if (allBinaryDigits && nonEmpty.length > 1) return "boolean";

  if (booleanCount >= threshold) return "boolean";
  if (numberCount >= threshold) return "number";

  return "string";
}

/**
 * Analyzes columns and suggests normalizations
 */
export function analyzeColumns(
  headers: string[],
  rows: Record<string, string>[]
): ColumnAnalysis[] {
  return headers.map((header) => {
    // Extract all values for this column
    const values = rows.map((row) => row[header] ?? "");

    // Count nulls/empty values
    const nullCount = values.filter(
      (v) => v === "" || v === null || v === undefined
    ).length;

    // Count unique values
    const uniqueValues = new Set(values.filter((v) => v !== ""));
    const uniqueCount = uniqueValues.size;

    // Get sample values (up to 5 non-empty)
    const sampleValues = values.filter((v) => v !== "").slice(0, 5);

    // Detect column type
    const detectedType = detectColumnType(values);

    return {
      originalName: header,
      suggestedName: normalizeColumnName(header),
      detectedType,
      sampleValues,
      nullCount,
      uniqueCount,
    };
  });
}

/**
 * Parses a number from various string formats
 */
function parseNumber(value: string): number | null {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  // Remove currency symbol, commas, and percentage
  let cleaned = value.replace(/^\$/, "").replace(/,/g, "").replace(/%$/, "");

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parses a boolean from various string formats
 */
function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase();
  return ["true", "yes", "1"].includes(lower);
}

/**
 * Parses a date string to ISO format
 * Checks for specific formats BEFORE calling new Date() to avoid ambiguity
 */
function parseDate(value: string): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // US format: MM/DD/YYYY or M/D/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // EU format: DD-MM-YYYY or DD.MM.YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Fallback: let Date.parse try (handles many formats)
  // Only use this for unambiguous formats
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date.toISOString();

  return null;
}

/**
 * Converts a row value to the appropriate type
 */
function convertValue(value: string, type: ColumnType): unknown {
  if (value === "" || value === null || value === undefined) {
    return type === "string" ? "" : null;
  }

  switch (type) {
    case "number":
      return parseNumber(value);
    case "boolean":
      return parseBoolean(value);
    case "date":
      return parseDate(value);
    case "url":
    case "email":
    case "string":
    default:
      return value;
  }
}

/**
 * Normalizes rows using column analysis
 */
export function normalizeRows(
  rows: Record<string, string>[],
  columns: ColumnAnalysis[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const normalized: Record<string, unknown> = {};

    for (const column of columns) {
      const originalValue = row[column.originalName] ?? "";
      const convertedValue = convertValue(originalValue, column.detectedType);
      normalized[column.suggestedName] = convertedValue;
    }

    return normalized;
  });
}
