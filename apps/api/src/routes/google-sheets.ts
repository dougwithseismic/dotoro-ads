/**
 * Google Sheets API Routes
 *
 * Routes for accessing Google Sheets data:
 * - GET /api/v1/google/spreadsheets - List user's spreadsheets
 * - GET /api/v1/google/spreadsheets/:spreadsheetId/sheets - List sheets in a spreadsheet
 * - GET /api/v1/google/spreadsheets/:spreadsheetId/sheets/:sheetName/data - Get sheet data
 *
 * All routes require x-user-id header and a connected Google account.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  googleSpreadsheetsResponseSchema,
  googleSheetsResponseSchema,
  googleSheetDataResponseSchema,
  googleSheetDataQuerySchema,
  googleSpreadsheetParamsSchema,
  googleSheetDataParamsSchema,
  googleOAuthErrorSchema,
} from "../schemas/google.js";
import { getGoogleCredentials } from "../services/oauth-tokens.js";
import {
  listSpreadsheets,
  listSheets,
  fetchSheetData,
} from "../services/google-sheets-service.js";

// ============================================================================
// Create the OpenAPI Hono app
// ============================================================================

export const googleSheetsApp = new OpenAPIHono();

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Error codes for Google Sheets API errors
 */
const ErrorCodes = {
  MISSING_USER_ID: "MISSING_USER_ID",
  GOOGLE_NOT_CONNECTED: "GOOGLE_NOT_CONNECTED",
  GOOGLE_API_ERROR: "GOOGLE_API_ERROR",
  GOOGLE_AUTH_ERROR: "GOOGLE_AUTH_ERROR",
  SPREADSHEET_NOT_FOUND: "SPREADSHEET_NOT_FOUND",
  SHEET_NOT_FOUND: "SHEET_NOT_FOUND",
  ACCESS_DENIED: "ACCESS_DENIED",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

/**
 * Categorize Google API errors and return appropriate HTTP status and error code
 */
function categorizeGoogleError(error: Error): {
  status: 401 | 403 | 404 | 429 | 500;
  code: string;
  message: string;
} {
  const message = error.message.toLowerCase();

  if (message.includes("unauthorized") || message.includes("invalid credentials")) {
    return {
      status: 401,
      code: ErrorCodes.GOOGLE_AUTH_ERROR,
      message: error.message,
    };
  }

  if (message.includes("permission denied") || message.includes("forbidden")) {
    return {
      status: 403,
      code: ErrorCodes.ACCESS_DENIED,
      message: error.message,
    };
  }

  if (message.includes("not found")) {
    // Determine if it's a spreadsheet or sheet that's not found
    if (message.includes("sheet") && message.includes("in spreadsheet")) {
      return {
        status: 404,
        code: ErrorCodes.SHEET_NOT_FOUND,
        message: error.message,
      };
    }
    return {
      status: 404,
      code: ErrorCodes.SPREADSHEET_NOT_FOUND,
      message: error.message,
    };
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return {
      status: 429,
      code: ErrorCodes.RATE_LIMITED,
      message: error.message,
    };
  }

  return {
    status: 500,
    code: ErrorCodes.GOOGLE_API_ERROR,
    message: error.message,
  };
}

// ============================================================================
// Route Definitions
// ============================================================================

const listSpreadsheetsRoute = createRoute({
  method: "get",
  path: "/api/v1/google/spreadsheets",
  tags: ["Google Sheets"],
  summary: "List user's Google Spreadsheets",
  description:
    "Returns a list of Google Spreadsheets accessible by the authenticated user. Requires a connected Google account.",
  responses: {
    200: {
      description: "List of spreadsheets",
      content: {
        "application/json": {
          schema: googleSpreadsheetsResponseSchema,
        },
      },
    },
    401: {
      description: "Missing user ID or Google account not connected",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    403: {
      description: "Access denied",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    404: {
      description: "Resource not found",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    429: {
      description: "Rate limited",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    500: {
      description: "Google API error",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
  },
});

const listSheetsRoute = createRoute({
  method: "get",
  path: "/api/v1/google/spreadsheets/{spreadsheetId}/sheets",
  tags: ["Google Sheets"],
  summary: "List sheets in a spreadsheet",
  description:
    "Returns a list of sheets (tabs) within a specific Google Spreadsheet. Requires a connected Google account.",
  request: {
    params: googleSpreadsheetParamsSchema,
  },
  responses: {
    200: {
      description: "List of sheets",
      content: {
        "application/json": {
          schema: googleSheetsResponseSchema,
        },
      },
    },
    401: {
      description: "Missing user ID or Google account not connected",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    403: {
      description: "Access denied to spreadsheet",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    404: {
      description: "Spreadsheet not found",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    429: {
      description: "Rate limited",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    500: {
      description: "Google API error",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
  },
});

const getSheetDataRoute = createRoute({
  method: "get",
  path: "/api/v1/google/spreadsheets/{spreadsheetId}/sheets/{sheetName}/data",
  tags: ["Google Sheets"],
  summary: "Get data from a sheet",
  description:
    "Fetches all data from a specific sheet in a Google Spreadsheet. Returns data as an array of records with column headers as keys. Requires a connected Google account.",
  request: {
    params: googleSheetDataParamsSchema,
    query: googleSheetDataQuerySchema,
  },
  responses: {
    200: {
      description: "Sheet data",
      content: {
        "application/json": {
          schema: googleSheetDataResponseSchema,
        },
      },
    },
    401: {
      description: "Missing user ID or Google account not connected",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    403: {
      description: "Access denied to spreadsheet",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    404: {
      description: "Spreadsheet or sheet not found",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    429: {
      description: "Rate limited",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
    500: {
      description: "Google API error",
      content: {
        "application/json": {
          schema: googleOAuthErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

googleSheetsApp.openapi(listSpreadsheetsRoute, async (c) => {
  // Get userId from x-user-id header
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return c.json(
      {
        error: "Missing user ID. Provide via x-user-id header.",
        code: ErrorCodes.MISSING_USER_ID,
      },
      401
    );
  }

  // Check if user has Google credentials
  const credentials = await getGoogleCredentials(userId);

  if (!credentials) {
    return c.json(
      {
        error: "Google account not connected. Please connect your Google account first.",
        code: ErrorCodes.GOOGLE_NOT_CONNECTED,
      },
      401
    );
  }

  try {
    const spreadsheets = await listSpreadsheets(credentials);

    return c.json(
      {
        spreadsheets,
      },
      200
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    const { status, code, message } = categorizeGoogleError(err);

    return c.json(
      {
        error: message,
        code,
      },
      status
    );
  }
});

googleSheetsApp.openapi(listSheetsRoute, async (c) => {
  // Get userId from x-user-id header
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return c.json(
      {
        error: "Missing user ID. Provide via x-user-id header.",
        code: ErrorCodes.MISSING_USER_ID,
      },
      401
    );
  }

  // Check if user has Google credentials
  const credentials = await getGoogleCredentials(userId);

  if (!credentials) {
    return c.json(
      {
        error: "Google account not connected. Please connect your Google account first.",
        code: ErrorCodes.GOOGLE_NOT_CONNECTED,
      },
      401
    );
  }

  const { spreadsheetId } = c.req.valid("param");

  try {
    const sheets = await listSheets(credentials, spreadsheetId);

    return c.json(
      {
        sheets,
      },
      200
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    const { status, code, message } = categorizeGoogleError(err);

    return c.json(
      {
        error: message,
        code,
      },
      status
    );
  }
});

googleSheetsApp.openapi(getSheetDataRoute, async (c) => {
  // Get userId from x-user-id header
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return c.json(
      {
        error: "Missing user ID. Provide via x-user-id header.",
        code: ErrorCodes.MISSING_USER_ID,
      },
      401
    );
  }

  // Check if user has Google credentials
  const credentials = await getGoogleCredentials(userId);

  if (!credentials) {
    return c.json(
      {
        error: "Google account not connected. Please connect your Google account first.",
        code: ErrorCodes.GOOGLE_NOT_CONNECTED,
      },
      401
    );
  }

  const { spreadsheetId, sheetName } = c.req.valid("param");
  const query = c.req.valid("query");
  const headerRow = query.headerRow ?? 1;

  try {
    const data = await fetchSheetData(credentials, spreadsheetId, sheetName, headerRow);

    // Extract columns from the first row of data, or empty array if no data
    const firstRow = data[0];
    const columns = firstRow ? Object.keys(firstRow) : [];

    return c.json(
      {
        data,
        columns,
        rowCount: data.length,
      },
      200
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    const { status, code, message } = categorizeGoogleError(err);

    return c.json(
      {
        error: message,
        code,
      },
      status
    );
  }
});

export default googleSheetsApp;
