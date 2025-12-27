import {
  parseCsv,
  previewCsv,
  analyzeColumns,
  normalizeRows,
  validateRows,
  type CsvParseResult,
  type ColumnAnalysis,
  type ValidationRule,
  type RowError,
} from "@repo/core";

/**
 * Result from data validation operations.
 * This matches the structure returned by validateRows from @repo/core.
 */
export interface DataValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: RowError[];
  errorsByField: Record<string, RowError[]>;
}

import { dataStore, type StoredDataSource } from "../stores/data-store.js";

export interface DataIngestionResult {
  dataSourceId: string;
  headers: string[];
  columns: ColumnAnalysis[];
  rowCount: number;
  preview: Record<string, unknown>[];
  validation?: DataValidationResult;
}

export interface PreviewResult {
  headers: string[];
  preview: Record<string, string>[];
}

export interface AnalysisResult {
  columns: ColumnAnalysis[];
  normalizedRows: Record<string, unknown>[];
}

// Maximum file size in bytes (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Process an uploaded CSV file
 * Parses, analyzes, normalizes, and stores the data
 */
export async function processUploadedCsv(
  dataSourceId: string,
  name: string,
  fileContent: string | Buffer,
  options?: { hasHeader?: boolean; delimiter?: string }
): Promise<DataIngestionResult> {
  // Validate file size
  const contentSize =
    typeof fileContent === "string"
      ? Buffer.byteLength(fileContent, "utf-8")
      : fileContent.length;

  if (contentSize > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${Math.round(contentSize / 1024 / 1024)}MB) exceeds maximum allowed size (100MB)`
    );
  }

  // Parse the CSV
  const parseResult = await parseCsv(fileContent, {
    hasHeader: options?.hasHeader ?? true,
    delimiter: options?.delimiter,
  });

  if (parseResult.headers.length === 0) {
    throw new Error("CSV file is empty or contains no valid data");
  }

  // Analyze columns
  const columns = analyzeColumns(parseResult.headers, parseResult.rows);

  // Normalize rows
  const normalizedRows = normalizeRows(parseResult.rows, columns);

  // Create preview from normalized rows
  const preview = normalizedRows.slice(0, 10);

  // Store in data store
  dataStore.setDataSource(dataSourceId, {
    name,
    type: "csv",
    headers: parseResult.headers,
    columns,
    rows: normalizedRows,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    dataSourceId,
    headers: parseResult.headers,
    columns,
    rowCount: normalizedRows.length,
    preview,
  };
}

/**
 * Get a quick preview of CSV data without full processing
 * Useful for showing users a preview before committing to full import
 */
export async function getDataPreview(
  fileContent: string | Buffer,
  rows: number = 10
): Promise<PreviewResult> {
  // Validate file size
  const contentSize =
    typeof fileContent === "string"
      ? Buffer.byteLength(fileContent, "utf-8")
      : fileContent.length;

  if (contentSize > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${Math.round(contentSize / 1024 / 1024)}MB) exceeds maximum allowed size (100MB)`
    );
  }

  const result = await previewCsv(fileContent, rows);

  return {
    headers: result.headers,
    preview: result.preview,
  };
}

/**
 * Analyze columns and normalize data
 * Returns both the column analysis and the normalized rows
 */
export function analyzeAndNormalize(
  headers: string[],
  rows: Record<string, string>[]
): AnalysisResult {
  const columns = analyzeColumns(headers, rows);
  const normalizedRows = normalizeRows(rows, columns);

  return {
    columns,
    normalizedRows,
  };
}

/**
 * Validate data against a set of rules
 */
export function validateData(
  rows: Record<string, unknown>[],
  rules: ValidationRule[]
): DataValidationResult {
  return validateRows(rows, rules);
}

/**
 * Get stored data source information
 */
export function getStoredDataSource(
  dataSourceId: string
): StoredDataSource | undefined {
  return dataStore.getDataSource(dataSourceId);
}

/**
 * Get paginated rows from stored data source
 */
export function getStoredRows(
  dataSourceId: string,
  page: number = 1,
  limit: number = 20
): { rows: Record<string, unknown>[]; total: number } {
  return dataStore.getRows(dataSourceId, page, limit);
}

/**
 * Check if a data source has stored data
 */
export function hasStoredData(dataSourceId: string): boolean {
  return dataStore.hasDataSource(dataSourceId);
}

/**
 * Delete stored data for a data source
 */
export function deleteStoredData(dataSourceId: string): boolean {
  return dataStore.deleteDataSource(dataSourceId);
}

/**
 * Clear all stored data (for testing)
 */
export function clearAllStoredData(): void {
  dataStore.clear();
}
