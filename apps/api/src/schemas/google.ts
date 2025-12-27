/**
 * Google OAuth Schema Definitions
 *
 * Zod schemas for Google OAuth routes including:
 * - OAuth flow initiation
 * - OAuth callback handling
 * - Connection status
 * - Account disconnection
 */

import { z } from "zod";

/**
 * Request body schema for OAuth connect endpoint
 * Note: userId can also be provided via x-user-id header (checked as fallback if not in body)
 */
export const googleOAuthConnectRequestSchema = z.object({
  redirectUrl: z.string().url().optional(),
  userId: z.string().min(1).optional(),
});

export type GoogleOAuthConnectRequest = z.infer<typeof googleOAuthConnectRequestSchema>;

/**
 * Response schema for OAuth connect endpoint
 */
export const googleOAuthConnectResponseSchema = z.object({
  authorizationUrl: z.string().url(),
  state: z.string().optional(),
});

export type GoogleOAuthConnectResponse = z.infer<typeof googleOAuthConnectResponseSchema>;

/**
 * Query parameters for OAuth callback
 */
export const googleOAuthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type GoogleOAuthCallbackQuery = z.infer<typeof googleOAuthCallbackQuerySchema>;

/**
 * Query parameters for status check
 * Note: userId can also be provided via x-user-id header (checked as fallback if not in query)
 */
export const googleOAuthStatusQuerySchema = z.object({
  userId: z.string().min(1).optional(),
});

export type GoogleOAuthStatusQuery = z.infer<typeof googleOAuthStatusQuerySchema>;

/**
 * Response schema for status check
 */
export const googleOAuthStatusResponseSchema = z.object({
  connected: z.boolean(),
  email: z.string().email().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type GoogleOAuthStatusResponse = z.infer<typeof googleOAuthStatusResponseSchema>;

/**
 * Request body for disconnect endpoint
 * Note: userId can also be provided via x-user-id header (checked as fallback if not in body)
 */
export const googleOAuthDisconnectRequestSchema = z.object({
  userId: z.string().min(1).optional(),
});

export type GoogleOAuthDisconnectRequest = z.infer<typeof googleOAuthDisconnectRequestSchema>;

/**
 * Response schema for disconnect endpoint
 */
export const googleOAuthDisconnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type GoogleOAuthDisconnectResponse = z.infer<typeof googleOAuthDisconnectResponseSchema>;

/**
 * Error response schema
 */
export const googleOAuthErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export type GoogleOAuthError = z.infer<typeof googleOAuthErrorSchema>;

// ============================================================================
// Google Sheets API Schemas
// ============================================================================

/**
 * Schema for a single spreadsheet from Google Drive
 */
export const googleSpreadsheetSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type GoogleSpreadsheet = z.infer<typeof googleSpreadsheetSchema>;

/**
 * Response schema for listing spreadsheets
 */
export const googleSpreadsheetsResponseSchema = z.object({
  spreadsheets: z.array(googleSpreadsheetSchema),
});

export type GoogleSpreadsheetsResponse = z.infer<typeof googleSpreadsheetsResponseSchema>;

/**
 * Schema for a single sheet within a spreadsheet
 */
export const googleSheetSchema = z.object({
  sheetId: z.number(),
  title: z.string(),
  index: z.number(),
});

export type GoogleSheet = z.infer<typeof googleSheetSchema>;

/**
 * Response schema for listing sheets in a spreadsheet
 */
export const googleSheetsResponseSchema = z.object({
  sheets: z.array(googleSheetSchema),
});

export type GoogleSheetsResponse = z.infer<typeof googleSheetsResponseSchema>;

/**
 * Query parameters for fetching sheet data
 */
export const googleSheetDataQuerySchema = z.object({
  headerRow: z.coerce.number().min(1).default(1).optional(),
});

export type GoogleSheetDataQuery = z.infer<typeof googleSheetDataQuerySchema>;

/**
 * Response schema for fetching sheet data
 */
export const googleSheetDataResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
  columns: z.array(z.string()),
  rowCount: z.number(),
});

export type GoogleSheetDataResponse = z.infer<typeof googleSheetDataResponseSchema>;

/**
 * Path parameters for sheets endpoints
 */
export const googleSpreadsheetParamsSchema = z.object({
  spreadsheetId: z.string().min(1),
});

export type GoogleSpreadsheetParams = z.infer<typeof googleSpreadsheetParamsSchema>;

/**
 * Path parameters for sheet data endpoint
 */
export const googleSheetDataParamsSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
});

export type GoogleSheetDataParams = z.infer<typeof googleSheetDataParamsSchema>;
