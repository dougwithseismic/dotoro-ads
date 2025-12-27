/**
 * Google Sheets Service
 *
 * Provides functionality to interact with Google Sheets API:
 * - List spreadsheets from Google Drive
 * - List sheets/tabs within a spreadsheet
 * - Fetch data from a specific sheet
 * - Handle OAuth token refresh
 *
 * Note: Full OAuth flow requires Google Cloud setup which is environment-specific.
 * This service handles the data fetching portion after OAuth is complete.
 */

import { eq } from "drizzle-orm";
import type { GoogleSheetsConfig, DataSourceConfig } from "@repo/database/schema";
import { db, dataSources, dataRows } from "./db.js";

/** Request timeout in milliseconds (30 seconds) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Token refresh buffer in milliseconds (5 minutes) */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Batch size for database inserts */
const BATCH_SIZE = 100;

/** Google API endpoints */
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4";
const GOOGLE_TOKEN_API = "https://oauth2.googleapis.com/token";

/**
 * Credentials required for Google Sheets API access
 */
export interface GoogleSheetsCredentials {
  accessToken: string;
  refreshToken: string;  // Empty string = no refresh token
  expiresAt: number | null;  // null = no expiry (non-expiring token)
}

/**
 * Spreadsheet metadata from Google Drive
 */
export interface Spreadsheet {
  id: string;
  name: string;
  modifiedTime: string; // ISO 8601 timestamp
}

/**
 * Sheet/tab metadata within a spreadsheet
 */
export interface Sheet {
  sheetId: number;
  title: string;
  index: number;
}

/**
 * Result of a fetch and ingest operation
 */
export interface FetchResult {
  success: boolean;
  rowCount: number;
  columns: string[];
  duration: number;
  error?: string;
}

/**
 * Fetches data from an API endpoint with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout after 30 seconds");
    }
    throw error;
  }
}

/**
 * Handles Google API error responses
 */
function handleApiError(response: Response, context: string): never {
  if (response.status === 401) {
    throw new Error(`Unauthorized: Invalid credentials for ${context}`);
  }
  if (response.status === 403) {
    throw new Error(`Permission denied: Access forbidden for ${context}`);
  }
  if (response.status === 404) {
    throw new Error(`Not found: ${context} does not exist`);
  }
  if (response.status === 429) {
    throw new Error(`Rate limit exceeded for ${context}. Please try again later.`);
  }
  throw new Error(`API error (${response.status}): ${response.statusText} for ${context}`);
}

/**
 * Refreshes the access token if it's expired or about to expire.
 *
 * @param credentials - Current credentials with potentially expired token
 * @returns Updated credentials with fresh access token, or original if still valid
 * @throws Error if refresh fails or no refresh token is available
 *
 * @example
 * ```typescript
 * const freshCredentials = await refreshTokenIfNeeded(credentials);
 * // Use freshCredentials.accessToken for API calls
 * ```
 */
export async function refreshTokenIfNeeded(
  credentials: GoogleSheetsCredentials
): Promise<GoogleSheetsCredentials> {
  // Check if token needs refresh (within 5 minutes of expiry)
  // If expiresAt is null, don't refresh (assume non-expiring or handle elsewhere)
  if (credentials.expiresAt === null) {
    console.log("[Google Sheets] Token has no expiry, assuming valid");
    return credentials;
  }

  const now = Date.now();
  const expiresIn = credentials.expiresAt - now;

  // Token is still valid with buffer time remaining
  if (expiresIn > TOKEN_REFRESH_BUFFER_MS) {
    return credentials;
  }

  // Need to refresh - check if we have a refresh token
  if (!credentials.refreshToken) {
    throw new Error("No refresh token available. User must re-authenticate.");
  }

  // Get client credentials from environment
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  const response = await fetchWithTimeout(
    GOOGLE_TOKEN_API,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error_description?: string }).error_description || "Token refresh failed";
    throw new Error(`Token refresh failed: ${errorMessage}. Token may have been revoked.`);
  }

  const tokenData = await response.json() as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    accessToken: tokenData.access_token,
    refreshToken: credentials.refreshToken, // Refresh token doesn't change
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
}

/**
 * Lists all Google Sheets spreadsheets accessible by the user.
 *
 * @param credentials - Google OAuth credentials
 * @returns Array of spreadsheet metadata (id and name)
 * @throws Error if API request fails
 *
 * @example
 * ```typescript
 * const spreadsheets = await listSpreadsheets(credentials);
 * console.log(spreadsheets);
 * // [{ id: "abc123", name: "Budget 2025" }, ...]
 * ```
 */
export async function listSpreadsheets(
  credentials: GoogleSheetsCredentials
): Promise<Spreadsheet[]> {
  const freshCredentials = await refreshTokenIfNeeded(credentials);

  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
  });

  const response = await fetchWithTimeout(
    `${GOOGLE_DRIVE_API}/files?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${freshCredentials.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    handleApiError(response, "listing spreadsheets");
  }

  const data = await response.json() as {
    files: Array<{ id: string; name: string; modifiedTime: string }>;
  };

  return (data.files || []).map((file) => ({
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
  }));
}

/**
 * Lists all sheets (tabs) within a specific spreadsheet.
 *
 * @param credentials - Google OAuth credentials
 * @param spreadsheetId - The ID of the spreadsheet
 * @returns Array of sheet metadata (sheetId, title, index)
 * @throws Error if spreadsheet not found or API request fails
 *
 * @example
 * ```typescript
 * const sheets = await listSheets(credentials, "abc123");
 * console.log(sheets);
 * // [{ sheetId: 0, title: "Sheet1", index: 0 }, ...]
 * ```
 */
export async function listSheets(
  credentials: GoogleSheetsCredentials,
  spreadsheetId: string
): Promise<Sheet[]> {
  const freshCredentials = await refreshTokenIfNeeded(credentials);

  const response = await fetchWithTimeout(
    `${GOOGLE_SHEETS_API}/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${freshCredentials.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    handleApiError(response, `spreadsheet ${spreadsheetId}`);
  }

  const data = await response.json() as {
    sheets: Array<{
      properties: { sheetId: number; title: string; index: number };
    }>;
  };

  return (data.sheets || []).map((sheet) => ({
    sheetId: sheet.properties.sheetId,
    title: sheet.properties.title,
    index: sheet.properties.index,
  }));
}

/**
 * Fetches data from a specific sheet and converts it to an array of records.
 *
 * @param credentials - Google OAuth credentials
 * @param spreadsheetId - The ID of the spreadsheet
 * @param sheetName - The name of the sheet/tab
 * @param headerRow - Row number containing headers (1-indexed, defaults to 1)
 * @returns Array of records where keys are column headers and values are cell values
 * @throws Error if sheet not found, access denied, or API request fails
 *
 * @example
 * ```typescript
 * const data = await fetchSheetData(credentials, "abc123", "Sheet1");
 * console.log(data);
 * // [{ Name: "Alice", Email: "alice@example.com" }, ...]
 * ```
 */
export async function fetchSheetData(
  credentials: GoogleSheetsCredentials,
  spreadsheetId: string,
  sheetName: string,
  headerRow: number = 1
): Promise<Record<string, unknown>[]> {
  const freshCredentials = await refreshTokenIfNeeded(credentials);

  // Fetch all values from the sheet
  const encodedSheetName = encodeURIComponent(sheetName);
  const response = await fetchWithTimeout(
    `${GOOGLE_SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodedSheetName}`,
    {
      headers: {
        Authorization: `Bearer ${freshCredentials.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    handleApiError(response, `sheet "${sheetName}" in spreadsheet ${spreadsheetId}`);
  }

  const data = await response.json() as {
    values?: string[][];
  };

  const values = data.values || [];

  // No data at all
  if (values.length === 0) {
    return [];
  }

  // Get header row (1-indexed, so subtract 1 for array index)
  const headerIndex = headerRow - 1;
  if (headerIndex >= values.length) {
    return [];
  }

  const headers = values[headerIndex] || [];

  // No headers found
  if (headers.length === 0) {
    return [];
  }

  // Convert data rows to records (everything after header row)
  const dataRows: Record<string, unknown>[] = [];
  for (let i = headerIndex + 1; i < values.length; i++) {
    const row = values[i] || [];
    const record: Record<string, unknown> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j] || `Column${j + 1}`;
      const value = row[j] ?? "";
      record[header] = value;
    }

    dataRows.push(record);
  }

  return dataRows;
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
    const googleSheets = currentConfig.googleSheets ?? ({} as GoogleSheetsConfig);

    // Update sync status fields
    const updatedGoogleSheets: GoogleSheetsConfig = {
      ...googleSheets,
      lastSyncStatus: status,
      lastSyncAt: status === "success" ? new Date().toISOString() : googleSheets.lastSyncAt,
      lastSyncError: status === "error" ? options.error : undefined,
    };

    const updatedConfig: DataSourceConfig = {
      ...currentConfig,
      googleSheets: updatedGoogleSheets,
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
 * Fetches data from Google Sheets and ingests it into a data source.
 *
 * @param dataSourceId - The ID of the data source to insert data into
 * @param config - The Google Sheets configuration
 * @param credentials - Google OAuth credentials
 * @returns A FetchResult with the operation outcome
 *
 * @example
 * ```typescript
 * const result = await fetchAndIngestGoogleSheets("ds-123", config, credentials);
 * if (result.success) {
 *   console.log(`Inserted ${result.rowCount} rows`);
 * }
 * ```
 */
export async function fetchAndIngestGoogleSheets(
  dataSourceId: string,
  config: GoogleSheetsConfig,
  credentials: GoogleSheetsCredentials
): Promise<FetchResult> {
  const startTime = Date.now();

  // Mark as syncing
  await updateSyncStatus(dataSourceId, "syncing");

  try {
    // Fetch data from Google Sheets
    const rows = await fetchSheetData(
      credentials,
      config.spreadsheetId,
      config.sheetName,
      config.headerRow
    );

    const columns = rows.length > 0 && rows[0] ? Object.keys(rows[0]) : [];

    // Clear existing items and insert new ones within a transaction
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
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateSyncStatus(dataSourceId, "error", { duration, error: errorMessage });

    return {
      success: false,
      rowCount: 0,
      columns: [],
      duration,
      error: errorMessage,
    };
  }
}
