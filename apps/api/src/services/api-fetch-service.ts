/**
 * API Fetch Service
 *
 * Fetches data from external APIs, flattens the response using @repo/core,
 * and inserts it into a data source.
 */

import { eq } from "drizzle-orm";
import { flattenJson, type JsonFlattenConfig } from "@repo/core";
import type { ApiFetchConfig, DataSourceConfig } from "@repo/database/schema";
import { db, dataSources, dataRows } from "./db.js";

/** Request timeout in milliseconds (30 seconds) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Maximum preview rows for test connection */
const MAX_PREVIEW_ROWS = 10;

/** Batch size for database inserts */
const BATCH_SIZE = 100;

/**
 * Validates that a URL is safe for external requests (SSRF prevention).
 * Blocks localhost, private IPs, cloud metadata endpoints, and non-HTTP protocols.
 */
function validateExternalUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS protocols are allowed" };
    }

    // Normalize hostname: remove brackets for IPv6 addresses
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      hostname = hostname.slice(1, -1);
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".local")
    ) {
      return { valid: false, error: "Internal/private URLs are not allowed" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Result of a fetch and ingest operation
 */
export interface FetchResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Number of rows inserted */
  rowCount: number;
  /** Column names from the flattened data */
  columns: string[];
  /** Duration of the operation in milliseconds */
  duration: number;
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Result of testing an API connection
 */
export interface TestConnectionResult {
  /** Whether the connection test succeeded */
  success: boolean;
  /** Preview data if successful */
  preview?: {
    /** Column headers from the flattened data */
    headers: string[];
    /** Sample rows (up to 10) */
    rows: unknown[];
  };
  /** Error message if the test failed */
  error?: string;
}

/**
 * Input for testing an API connection (subset of ApiFetchConfig)
 */
export interface TestConnectionInput {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  flattenConfig?: JsonFlattenConfig;
  authType?: "none" | "bearer" | "api-key" | "basic";
  authCredentials?: string;
}

/**
 * Builds HTTP headers for the request, including authentication
 */
function buildHeaders(config: {
  headers?: Record<string, string>;
  authType?: "none" | "bearer" | "api-key" | "basic";
  authCredentials?: string;
}): Record<string, string> {
  const headers: Record<string, string> = { ...config.headers };

  // Add authentication header based on auth type
  if (config.authType && config.authType !== "none" && config.authCredentials) {
    switch (config.authType) {
      case "bearer":
        headers["Authorization"] = `Bearer ${config.authCredentials}`;
        break;
      case "api-key":
        headers["X-API-Key"] = config.authCredentials;
        break;
      case "basic":
        headers["Authorization"] = `Basic ${config.authCredentials}`;
        break;
    }
  }

  return headers;
}

/**
 * Validates that the response has JSON content type
 */
function isJsonContentType(response: Response): boolean {
  const contentType = response.headers.get("content-type") || "";
  return (
    contentType.includes("application/json") ||
    contentType.includes("text/json")
  );
}

/**
 * Fetches data from an API endpoint with timeout and error handling
 */
async function fetchFromApi(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<{ data: unknown; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retryMessage = retryAfter
        ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
        : "Rate limit exceeded. Please try again later.";
      return { data: null, error: retryMessage };
    }

    // Handle HTTP errors
    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Validate content type
    if (!isJsonContentType(response)) {
      return {
        data: null,
        error: "Response is not JSON. Expected application/json content type.",
      };
    }

    // Parse JSON response
    try {
      const data = await response.json();
      return { data };
    } catch {
      return {
        data: null,
        error: "Failed to parse JSON response. Invalid JSON format.",
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { data: null, error: "Request timeout after 30 seconds." };
      }
      return { data: null, error: `Network error: ${error.message}` };
    }
    return { data: null, error: "Unknown error occurred" };
  }
}

/**
 * Flattens JSON data using the provided configuration
 */
function flattenData(
  data: unknown,
  flattenConfig?: JsonFlattenConfig
): Record<string, unknown>[] {
  // If no flatten config, use default settings
  const config: JsonFlattenConfig = flattenConfig ?? {
    arrayHandling: "join",
    maxDepth: 3,
  };

  return flattenJson(data, config);
}

/**
 * Extracts column names from flattened rows
 */
function extractColumns(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];

  // Use the first row to determine columns
  return Object.keys(rows[0]);
}

/**
 * Updates the sync status in the data source config
 */
async function updateSyncStatus(
  dataSourceId: string,
  status: "success" | "error" | "syncing",
  options: {
    duration?: number;
    error?: string;
  } = {}
): Promise<void> {
  try {
    // Get current config
    const [source] = await db
      .select({ config: dataSources.config })
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId))
      .limit(1);

    if (!source) return;

    const currentConfig = (source.config as DataSourceConfig) ?? {};
    const apiFetch = currentConfig.apiFetch ?? ({} as ApiFetchConfig);

    // Update sync status fields
    const updatedApiFetch: ApiFetchConfig = {
      ...apiFetch,
      lastSyncStatus: status,
      lastSyncAt: status === "success" ? new Date().toISOString() : apiFetch.lastSyncAt,
      lastSyncDuration: options.duration,
      lastSyncError: status === "error" ? options.error : undefined,
    };

    const updatedConfig: DataSourceConfig = {
      ...currentConfig,
      apiFetch: updatedApiFetch,
    };

    await db
      .update(dataSources)
      .set({ config: updatedConfig })
      .where(eq(dataSources.id, dataSourceId));
  } catch (error) {
    console.error(`[updateSyncStatus] Failed to update sync status:`, error);
  }
}

/**
 * Fetches data from an external API, flattens the response, and inserts it into a data source.
 *
 * @param dataSourceId - The ID of the data source to insert data into
 * @param config - The API fetch configuration
 * @returns A FetchResult with the operation outcome
 *
 * @example
 * ```typescript
 * const result = await fetchAndIngest("ds-123", {
 *   url: "https://api.example.com/products",
 *   method: "GET",
 *   syncFrequency: "24h",
 *   flattenConfig: {
 *     dataPath: "data.items",
 *     arrayHandling: "join"
 *   }
 * });
 *
 * if (result.success) {
 *   console.log(`Inserted ${result.rowCount} rows`);
 * } else {
 *   console.error(`Failed: ${result.error}`);
 * }
 * ```
 */
export async function fetchAndIngest(
  dataSourceId: string,
  config: ApiFetchConfig
): Promise<FetchResult> {
  const startTime = Date.now();

  // Validate URL to prevent SSRF attacks
  const urlValidation = validateExternalUrl(config.url);
  if (!urlValidation.valid) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      rowCount: 0,
      columns: [],
      duration,
      error: urlValidation.error,
    };
  }

  // Mark as syncing
  await updateSyncStatus(dataSourceId, "syncing");

  // Build request options
  const headers = buildHeaders({
    headers: config.headers,
    authType: config.authType,
    authCredentials: config.authCredentials,
  });

  const requestOptions: RequestInit = {
    method: config.method,
    headers,
  };

  // Auto-set Content-Type for POST with body if not specified
  if (config.method === "POST" && config.body) {
    requestOptions.body = config.body;
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  // Fetch data from API
  const { data, error } = await fetchFromApi(config.url, requestOptions);

  if (error) {
    const duration = Date.now() - startTime;
    await updateSyncStatus(dataSourceId, "error", { duration, error });
    return {
      success: false,
      rowCount: 0,
      columns: [],
      duration,
      error,
    };
  }

  // Flatten the data
  const rows = flattenData(data, config.flattenConfig);
  const columns = extractColumns(rows);

  // Clear existing items and insert new ones within a transaction
  try {
    await db.transaction(async (tx) => {
      // Delete existing rows
      await tx.delete(dataRows).where(eq(dataRows.dataSourceId, dataSourceId));

      // Insert new rows in batches
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const batchValues = batch.map((rowData, idx) => ({
            dataSourceId,
            rowData,
            rowIndex: i + idx,
          }));

          await tx.insert(dataRows).values(batchValues);
        }
      }
    });

    const duration = Date.now() - startTime;
    await updateSyncStatus(dataSourceId, "success", { duration });

    return {
      success: true,
      rowCount: rows.length,
      columns,
      duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : "Database error";
    await updateSyncStatus(dataSourceId, "error", { duration, error: errorMessage });

    return {
      success: false,
      rowCount: 0,
      columns: [],
      duration,
      error: `Failed to insert data: ${errorMessage}`,
    };
  }
}

/**
 * Tests an API connection without persisting data.
 * Returns a preview of the flattened data if successful.
 *
 * @param input - The connection test configuration
 * @returns A TestConnectionResult with preview data or error
 *
 * @example
 * ```typescript
 * const result = await testApiConnection({
 *   url: "https://api.example.com/products",
 *   method: "GET",
 *   flattenConfig: {
 *     dataPath: "data.items",
 *     arrayHandling: "join"
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Columns:", result.preview.headers);
 *   console.log("Sample rows:", result.preview.rows);
 * }
 * ```
 */
export async function testApiConnection(
  input: TestConnectionInput
): Promise<TestConnectionResult> {
  // Validate URL to prevent SSRF attacks
  const urlValidation = validateExternalUrl(input.url);
  if (!urlValidation.valid) {
    return {
      success: false,
      error: urlValidation.error,
    };
  }

  // Build request options
  const headers = buildHeaders({
    headers: input.headers,
    authType: input.authType,
    authCredentials: input.authCredentials,
  });

  const requestOptions: RequestInit = {
    method: input.method,
    headers,
  };

  // Auto-set Content-Type for POST with body if not specified
  if (input.method === "POST" && input.body) {
    requestOptions.body = input.body;
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  // Fetch data from API
  const { data, error } = await fetchFromApi(input.url, requestOptions);

  if (error) {
    return {
      success: false,
      error,
    };
  }

  // Flatten the data
  const rows = flattenData(data, input.flattenConfig);
  const headers_list = extractColumns(rows);

  // Limit preview rows
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);

  return {
    success: true,
    preview: {
      headers: headers_list,
      rows: previewRows,
    },
  };
}
