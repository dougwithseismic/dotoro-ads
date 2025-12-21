import Papa, { type ParseResult } from "papaparse";

export interface CsvParseOptions {
  hasHeader?: boolean;
  delimiter?: string;
  encoding?: "utf-8" | "latin1" | "auto";
  previewRows?: number;
}

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  preview: Record<string, string>[];
  errors: CsvParseError[];
}

export interface CsvParseError {
  row: number;
  message: string;
}

/**
 * Makes header names unique by appending _2, _3, etc. for duplicates
 */
function makeHeadersUnique(headers: string[]): string[] {
  const seen = new Map<string, number>();
  const result: string[] = [];

  for (const header of headers) {
    const count = seen.get(header) ?? 0;
    if (count === 0) {
      result.push(header);
      seen.set(header, 1);
    } else {
      const newCount = count + 1;
      result.push(`${header}_${newCount}`);
      seen.set(header, newCount);
    }
  }

  return result;
}

/**
 * Generates default column headers (column_1, column_2, etc.)
 */
function generateDefaultHeaders(columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, i) => `column_${i + 1}`);
}

/**
 * Converts a buffer to string with the specified encoding
 */
function bufferToString(
  buffer: Buffer,
  encoding: "utf-8" | "latin1" | "auto"
): string {
  if (encoding === "latin1") {
    return buffer.toString("latin1");
  }
  // Default to utf-8
  return buffer.toString("utf-8");
}

/**
 * Parses CSV content and returns structured data
 */
export async function parseCsv(
  input: string | Buffer,
  options: CsvParseOptions = {}
): Promise<CsvParseResult> {
  const {
    hasHeader = true,
    delimiter,
    encoding = "utf-8",
    previewRows = 10,
  } = options;

  // Convert buffer to string if needed
  let content: string;
  if (Buffer.isBuffer(input)) {
    content = bufferToString(input, encoding);
  } else {
    content = input;
  }

  // Handle empty content
  if (!content.trim()) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      preview: [],
      errors: [],
    };
  }

  return new Promise((resolve) => {
    const errors: CsvParseError[] = [];
    const rawRows: string[][] = [];
    let headers: string[] = [];

    Papa.parse<string[]>(content, {
      delimiter: delimiter || undefined,
      header: false, // We handle headers ourselves for better control
      skipEmptyLines: true,
      complete: (results: ParseResult<string[]>) => {
        const data = results.data;

        if (data.length === 0) {
          resolve({
            headers: [],
            rows: [],
            totalRows: 0,
            preview: [],
            errors: [],
          });
          return;
        }

        // Extract headers
        if (hasHeader) {
          const firstRow = data[0];
          if (firstRow && Array.isArray(firstRow)) {
            headers = makeHeadersUnique(firstRow);
            for (let i = 1; i < data.length; i++) {
              const row = data[i];
              if (row && Array.isArray(row)) {
                rawRows.push(row);
              }
            }
          }
        } else {
          // Generate default headers based on first row column count
          const firstRow = data[0];
          if (firstRow && Array.isArray(firstRow)) {
            headers = generateDefaultHeaders(firstRow.length);
            for (const row of data) {
              if (row && Array.isArray(row)) {
                rawRows.push(row);
              }
            }
          }
        }

        // Convert raw rows to objects
        const rows: Record<string, string>[] = rawRows.map((row, index) => {
          const obj: Record<string, string> = {};

          // Handle rows with different column counts
          if (row.length !== headers.length && row.length > 0) {
            // For rows with fewer columns, fill with empty strings
            // For rows with more columns, ignore extra columns
            // This is logged as an error for the user
            if (row.length < headers.length || row.length > headers.length) {
              errors.push({
                row: hasHeader ? index + 2 : index + 1, // Account for header row
                message: `Row has ${row.length} columns, expected ${headers.length}`,
              });
            }
          }

          headers.forEach((header, i) => {
            obj[header] = row[i] ?? "";
          });

          return obj;
        });

        // Collect Papa Parse errors
        for (const error of results.errors) {
          errors.push({
            row: error.row ?? 0,
            message: error.message,
          });
        }

        // Create preview
        const preview = rows.slice(0, previewRows);

        resolve({
          headers,
          rows,
          totalRows: rows.length,
          preview,
          errors,
        });
      },
    });
  });
}

/**
 * Quick preview of CSV file - only parses first N rows
 * Uses PapaParse's preview option to limit parsing at the source level
 */
export async function previewCsv(
  input: string | Buffer,
  rows: number = 10
): Promise<{ headers: string[]; preview: Record<string, string>[] }> {
  const content = typeof input === "string" ? input : input.toString("utf-8");

  // Handle empty content
  if (!content.trim()) {
    return { headers: [], preview: [] };
  }

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(content, {
      preview: rows + 1, // +1 for header row
      header: false,
      skipEmptyLines: true,
      complete: (parseResult) => {
        if (parseResult.data.length === 0) {
          resolve({ headers: [], preview: [] });
          return;
        }

        const headers = makeHeadersUnique(parseResult.data[0] || []);
        const dataRows = parseResult.data.slice(1);

        const preview = dataRows.map((row) => {
          const record: Record<string, string> = {};
          headers.forEach((header, i) => {
            record[header] = row[i] ?? "";
          });
          return record;
        });

        resolve({ headers, preview });
      },
      error: (error: Error) =>
        reject(new Error(`CSV preview failed: ${error.message}`)),
    });
  });
}
