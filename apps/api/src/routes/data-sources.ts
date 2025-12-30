import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, count, asc, inArray, max, and } from "drizzle-orm";
import {
  dataSourceSchema,
  createDataSourceSchema,
  updateDataSourceSchema,
  dataSourceListResponseSchema,
  dataRowSchema,
  dataRowsListResponseSchema,
  dataRowsQuerySchema,
  previewRequestSchema,
  uploadResponseSchema,
  csvPreviewRequestSchema,
  csvPreviewResponseSchema,
  validateRequestSchema,
  validationResponseSchema,
  analyzeResponseSchema,
  dataSourceDetailSchema,
  // Item CRUD schemas
  bulkInsertItemsRequestSchema,
  bulkInsertItemsResponseSchema,
  updateItemRequestSchema,
  clearItemsQuerySchema,
  clearItemsResponseSchema,
  itemIdParamSchema,
  // API Key schemas (Phase 0B)
  apiKeyResponseSchema,
  apiKeyRegenerateResponseSchema,
  // API Fetch schemas (Phase 2B)
  testConnectionRequestSchema,
  testConnectionResponseSchema,
  // Sync Job schemas (Phase 2C)
  manualSyncResponseSchema,
  // Column stats and template validation schemas
  computeStatsResponseSchema,
  validateTemplateRequestSchema,
  validateTemplateResponseSchema,
} from "../schemas/data-sources.js";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { apiKeyAuth } from "../middleware/api-key-auth.js";
import type { DataSourceConfig, ApiKeyConfig } from "@repo/database/schema";
import { idParamSchema, paginationSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import {
  createNotFoundError,
  createValidationError,
  ApiException,
  ErrorCode,
} from "../lib/errors.js";
import {
  processUploadedCsv,
  getDataPreview,
  validateData,
  getStoredDataSource,
  getStoredRows,
  hasStoredData,
  deleteStoredData,
  clearAllStoredData,
} from "../services/data-ingestion.js";
import { testApiConnection } from "../services/api-fetch-service.js";
import { computeColumnLengthStats } from "../services/column-analysis.js";
import { validateTemplateAgainstData } from "../services/template-validation.js";
import { getJobQueueReady } from "../jobs/queue.js";
import { SYNC_API_DATA_SOURCE_JOB, type SyncApiDataSourceJob } from "../jobs/handlers/sync-api-data-source.js";
import { SYNC_GOOGLE_SHEETS_JOB, type SyncGoogleSheetsJob } from "../jobs/handlers/sync-google-sheets.js";
import type { ValidationRule } from "@repo/core";
import { db, dataSources, dataRows, transforms, columnMappings } from "../services/db.js";
import type { DataSourceStatus } from "../schemas/data-sources.js";
import { requireTeamAuth, getTeamContext, type TeamAuthVariables } from "../middleware/team-auth.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute row count for a data source.
 * First checks in-memory store (for recently uploaded data),
 * then falls back to database count.
 */
async function computeRowCount(dataSourceId: string): Promise<number> {
  // Check in-memory store first (recent uploads)
  if (hasStoredData(dataSourceId)) {
    const { total } = getStoredRows(dataSourceId, 1, 1);
    return total;
  }

  // Fall back to database count
  try {
    const [countResult] = await db
      .select({ count: count() })
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId));

    return countResult?.count ?? 0;
  } catch (error) {
    console.error(`[computeRowCount] Database query failed for dataSourceId=${dataSourceId}:`, error);
    throw error; // Let route handler deal with it
  }
}

/**
 * Batch compute row counts for multiple data sources.
 * Uses a single database query instead of N individual queries.
 */
async function computeRowCountsBatch(sourceIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  // Initialize all to 0
  sourceIds.forEach(id => counts.set(id, 0));

  // Check in-memory store first (use getStoredRows for consistency with computeRowCount)
  for (const id of sourceIds) {
    if (hasStoredData(id)) {
      const { total } = getStoredRows(id, 1, 1);
      counts.set(id, total);
    }
  }

  // Get remaining from database in a single query
  const idsWithoutMemoryData = sourceIds.filter(id => !hasStoredData(id));
  if (idsWithoutMemoryData.length > 0) {
    try {
      const dbCounts = await db
        .select({
          dataSourceId: dataRows.dataSourceId,
          count: count()
        })
        .from(dataRows)
        .where(inArray(dataRows.dataSourceId, idsWithoutMemoryData))
        .groupBy(dataRows.dataSourceId);

      for (const row of dbCounts) {
        counts.set(row.dataSourceId, row.count);
      }
    } catch (error) {
      console.error(
        `[computeRowCountsBatch] Database query failed for ${idsWithoutMemoryData.length} data sources:`,
        error
      );
      throw error;
    }
  }

  return counts;
}

/**
 * Derive status for a data source based on its data and config.
 */
function deriveStatus(
  rowCount: number,
  config: Record<string, unknown> | null
): DataSourceStatus {
  // Check for error state stored in config
  if (config?.error) {
    return "error";
  }

  // If we have data, it's ready
  if (rowCount > 0) {
    return "ready";
  }

  // No data yet - return "ready" as the source exists but is empty
  // Note: "processing" is reserved for future async ingestion workflows
  return "ready";
}

/**
 * Verify a data source belongs to the specified team.
 * Returns the data source if valid, throws 404 if not found or wrong team.
 * We return 404 instead of 403 to avoid leaking resource existence across teams.
 */
async function verifyDataSourceTeamOwnership(
  id: string,
  teamId: string
): Promise<{
  id: string;
  userId: string | null;
  teamId: string | null;
  name: string;
  type: "csv" | "api" | "manual" | "google-sheets";
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}> {
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Verify data source belongs to the team
  if (dataSource.teamId !== teamId) {
    throw createNotFoundError("Data source", id);
  }

  return dataSource;
}

// Create the OpenAPI Hono app with team context
export const dataSourcesApp = new OpenAPIHono<{ Variables: TeamAuthVariables }>();

// Apply team auth middleware to all data sources routes
// This validates the X-Team-Id header and verifies team membership
dataSourcesApp.use("/api/v1/data-sources/*", requireTeamAuth());
dataSourcesApp.use("/api/v1/data-sources", requireTeamAuth());

// Apply API key auth middleware to bulk insert route
// This middleware validates X-API-Key header if present, otherwise falls through
dataSourcesApp.use("/api/v1/data-sources/:id/items", apiKeyAuth());

// ============================================================================
// Route Definitions
// ============================================================================

// GET /api/v1/data-sources - List all data sources
const listDataSourcesRoute = createRoute({
  method: "get",
  path: "/api/v1/data-sources",
  tags: ["Data Sources"],
  summary: "List all data sources",
  description: "Returns a paginated list of all data sources",
  request: {
    query: paginationSchema,
  },
  responses: {
    200: {
      description: "List of data sources",
      content: {
        "application/json": {
          schema: dataSourceListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources - Create a new data source
const createDataSourceRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources",
  tags: ["Data Sources"],
  summary: "Create a new data source",
  description: "Creates a new data source with the provided configuration",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createDataSourceSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Data source created successfully",
      content: {
        "application/json": {
          schema: dataSourceSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// GET /api/v1/data-sources/:id - Get a data source by ID
const getDataSourceRoute = createRoute({
  method: "get",
  path: "/api/v1/data-sources/{id}",
  tags: ["Data Sources"],
  summary: "Get a data source by ID",
  description: "Returns the details of a specific data source including column mappings and preview data",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Data source details with column mappings and data preview",
      content: {
        "application/json": {
          schema: dataSourceDetailSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// PUT /api/v1/data-sources/:id - Update a data source
const updateDataSourceRoute = createRoute({
  method: "put",
  path: "/api/v1/data-sources/{id}",
  tags: ["Data Sources"],
  summary: "Update a data source",
  description: "Updates an existing data source",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateDataSourceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Data source updated successfully",
      content: {
        "application/json": {
          schema: dataSourceSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// PATCH /api/v1/data-sources/:id - Partially update a data source
const patchDataSourceRoute = createRoute({
  method: "patch",
  path: "/api/v1/data-sources/{id}",
  tags: ["Data Sources"],
  summary: "Partially update a data source",
  description: "Partially updates an existing data source. Config updates are merged with existing config.",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateDataSourceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Data source updated successfully",
      content: {
        "application/json": {
          schema: dataSourceSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// Query schema for delete with force option
const deleteQuerySchema = z.object({
  force: z.enum(["true", "false"]).optional().default("false"),
});

// DELETE /api/v1/data-sources/:id - Delete a data source
const deleteDataSourceRoute = createRoute({
  method: "delete",
  path: "/api/v1/data-sources/{id}",
  tags: ["Data Sources"],
  summary: "Delete a data source",
  description: "Deletes a data source and all associated data rows. If the data source is used as a source for transforms, deletion will fail unless force=true is specified.",
  request: {
    params: idParamSchema,
    query: deleteQuerySchema,
  },
  responses: {
    204: {
      description: "Data source deleted successfully",
    },
    409: {
      description: "Data source is used by transforms",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
            code: z.string(),
            details: z.object({
              transformCount: z.number(),
              transforms: z.array(z.object({
                id: z.string(),
                name: z.string(),
              })),
            }),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// GET /api/v1/data-sources/:id/rows - Get paginated data rows
const getDataRowsRoute = createRoute({
  method: "get",
  path: "/api/v1/data-sources/{id}/rows",
  tags: ["Data Sources"],
  summary: "Get data rows",
  description:
    "Returns paginated data rows for a specific data source. Returns data from uploaded CSV if available, otherwise falls back to database rows.",
  request: {
    params: idParamSchema,
    query: dataRowsQuerySchema,
  },
  responses: {
    200: {
      description: "List of data rows",
      content: {
        "application/json": {
          schema: dataRowsListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/:id/preview - Preview data rows
const previewDataSourceRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/preview",
  tags: ["Data Sources"],
  summary: "Preview data rows",
  description: "Returns a limited preview of data rows",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: previewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview of data rows",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(dataRowSchema),
            total: z.number(),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/:id/upload - Upload CSV file
const uploadDataSourceRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/upload",
  tags: ["Data Sources"],
  summary: "Upload CSV file",
  description:
    "Uploads and processes a CSV file for the data source. The file should be sent as multipart/form-data with the field name 'file'. Returns column analysis and a preview of the normalized data.",
  request: {
    params: idParamSchema,
  },
  responses: {
    201: {
      description: "File uploaded and processed successfully",
      content: {
        "application/json": {
          schema: uploadResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/preview-csv - Preview CSV content
const previewCsvRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/preview-csv",
  tags: ["Data Sources"],
  summary: "Preview CSV content",
  description:
    "Parses and previews CSV content without creating a data source. Useful for validating CSV format before upload.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: csvPreviewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "CSV preview",
      content: {
        "application/json": {
          schema: csvPreviewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/:id/validate - Validate data against rules
const validateDataSourceRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/validate",
  tags: ["Data Sources"],
  summary: "Validate data rows",
  description:
    "Validates all data rows against the provided validation rules. Returns validation results including any errors found.",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: validateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Validation results",
      content: {
        "application/json": {
          schema: validationResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/:id/analyze - Analyze columns
const analyzeDataSourceRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/analyze",
  tags: ["Data Sources"],
  summary: "Analyze columns",
  description:
    "Analyzes the columns of uploaded data and returns type detection and normalization suggestions.",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Column analysis results",
      content: {
        "application/json": {
          schema: analyzeResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// Column response schema matching frontend DataSourceColumn type
const columnResponseSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "date", "unknown"]),
  sampleValues: z.array(z.string()).optional(),
});

// Sample data query schema
const sampleQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

// GET /api/v1/data-sources/:id/sample - Get sample rows (for preview/hierarchy config)
const getSampleRoute = createRoute({
  method: "get",
  path: "/api/v1/data-sources/{id}/sample",
  tags: ["Data Sources"],
  summary: "Get sample data rows",
  description:
    "Returns a limited sample of data rows for preview purposes. Works with both in-memory stored data (recent uploads) and persisted database rows.",
  request: {
    params: idParamSchema,
    query: sampleQuerySchema,
  },
  responses: {
    200: {
      description: "Sample data rows",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(z.record(z.unknown())),
            total: z.number(),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// GET /api/v1/data-sources/:id/columns - Get column info for a data source
const getColumnsRoute = createRoute({
  method: "get",
  path: "/api/v1/data-sources/{id}/columns",
  tags: ["Data Sources"],
  summary: "Get column info",
  description:
    "Returns column information including name, type, and sample values for a data source. Works with both in-memory stored data (recent uploads) and persisted database rows.",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Column information",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(columnResponseSchema),
          }),
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Item CRUD Route Definitions (Phase 0A)
// ============================================================================

// POST /api/v1/data-sources/:id/items - Bulk insert items
const bulkInsertItemsRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/items",
  tags: ["Data Sources"],
  summary: "Bulk insert items",
  description:
    "Inserts multiple items into a data source. Use mode 'append' to add to existing data or 'replace' to clear and insert. Inserts are batched in chunks of 100 for performance.",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: bulkInsertItemsRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Items inserted successfully",
      content: {
        "application/json": {
          schema: bulkInsertItemsResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// PUT /api/v1/data-sources/:id/items/:itemId - Update single item
const updateItemRoute = createRoute({
  method: "put",
  path: "/api/v1/data-sources/{id}/items/{itemId}",
  tags: ["Data Sources"],
  summary: "Update a single item",
  description: "Updates the data of a single item in a data source.",
  request: {
    params: itemIdParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateItemRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Item updated successfully",
      content: {
        "application/json": {
          schema: dataRowSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// DELETE /api/v1/data-sources/:id/items/:itemId - Delete single item
const deleteItemRoute = createRoute({
  method: "delete",
  path: "/api/v1/data-sources/{id}/items/{itemId}",
  tags: ["Data Sources"],
  summary: "Delete a single item",
  description: "Deletes a single item from a data source.",
  request: {
    params: itemIdParamSchema,
  },
  responses: {
    204: {
      description: "Item deleted successfully",
    },
    ...commonResponses,
  },
});

// DELETE /api/v1/data-sources/:id/items - Clear all items
const clearItemsRoute = createRoute({
  method: "delete",
  path: "/api/v1/data-sources/{id}/items",
  tags: ["Data Sources"],
  summary: "Clear all items",
  description:
    "Deletes all items from a data source. Requires confirm=true query parameter to prevent accidental deletion.",
  request: {
    params: idParamSchema,
    query: clearItemsQuerySchema,
  },
  responses: {
    200: {
      description: "Items cleared successfully",
      content: {
        "application/json": {
          schema: clearItemsResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// API Key Route Definitions (Phase 0B)
// ============================================================================

// POST /api/v1/data-sources/:id/api-key - Generate API key
const generateApiKeyRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/api-key",
  tags: ["Data Sources"],
  summary: "Generate API key for data source",
  description:
    "Generates a new API key for external push access to the data source. The key is shown ONLY ONCE in this response and cannot be retrieved later. Store it securely.",
  request: {
    params: idParamSchema,
  },
  responses: {
    201: {
      description: "API key generated successfully",
      content: {
        "application/json": {
          schema: apiKeyResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/:id/api-key/regenerate - Regenerate API key
const regenerateApiKeyRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/api-key/regenerate",
  tags: ["Data Sources"],
  summary: "Regenerate API key for data source",
  description:
    "Generates a new API key and invalidates the previous key. The new key is shown ONLY ONCE in this response. Any systems using the old key will need to be updated.",
  request: {
    params: idParamSchema,
  },
  responses: {
    201: {
      description: "API key regenerated successfully",
      content: {
        "application/json": {
          schema: apiKeyRegenerateResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// API Fetch Route Definitions (Phase 2B)
// ============================================================================

// POST /api/v1/data-sources/test-connection - Test API connection
const testConnectionRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/test-connection",
  tags: ["Data Sources"],
  summary: "Test API connection",
  description:
    "Tests an API connection without creating a data source. Returns a preview of the flattened data if successful. Use this to validate API configuration before creating a data source.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: testConnectionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Connection test result with preview data",
      content: {
        "application/json": {
          schema: testConnectionResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Sync Job Route Definitions (Phase 2C)
// ============================================================================

// POST /api/v1/data-sources/:id/sync - Trigger manual sync
const triggerSyncRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/sync",
  tags: ["Data Sources"],
  summary: "Trigger manual sync",
  description:
    "Triggers a manual sync for a data source. Supports 'api' and 'google-sheets' types. " +
    "For API sources, fetches data from the configured API endpoint. " +
    "For Google Sheets sources, fetches data from the connected spreadsheet (requires x-user-id header). " +
    "CSV and manual types cannot be synced - use upload or items endpoints instead.",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Sync job queued successfully",
      content: {
        "application/json": {
          schema: manualSyncResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

dataSourcesApp.openapi(listDataSourcesRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Get total count for this team
  const [countResult] = await db
    .select({ count: count() })
    .from(dataSources)
    .where(eq(dataSources.teamId, teamId));
  const total = countResult?.count ?? 0;

  // Get paginated data filtered by team
  const sources = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.teamId, teamId))
    .limit(limit)
    .offset(offset)
    .orderBy(dataSources.createdAt);

  // Get row counts in a single batch query (fixes N+1 performance issue)
  const sourceIds = sources.map(s => s.id);
  const rowCounts = await computeRowCountsBatch(sourceIds);

  // Convert to API format with computed rowCount and status
  const data = sources.map((source) => {
    const rowCount = rowCounts.get(source.id) ?? 0;
    const status = deriveStatus(rowCount, source.config);
    return {
      id: source.id,
      userId: source.userId,
      teamId: source.teamId,
      name: source.name,
      type: source.type,
      config: source.config,
      rowCount,
      status,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };
  });

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

dataSourcesApp.openapi(createDataSourceRoute, async (c) => {
  const body = c.req.valid("json");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const [newDataSource] = await db
    .insert(dataSources)
    .values({
      name: body.name,
      type: body.type,
      config: body.config ?? null,
      teamId, // Set team ID from context
    })
    .returning();

  if (!newDataSource) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create data source");
  }

  // Queue initial sync for syncable data source types with proper configuration
  const config = newDataSource.config as DataSourceConfig | null;

  // Check for Google Sheets config (can be stored directly or nested under googleSheets)
  const hasGoogleSheetsConfig = config?.spreadsheetId || config?.googleSheets?.spreadsheetId;
  if (newDataSource.type === "google-sheets" && hasGoogleSheetsConfig) {
    // For Google Sheets, we need a user ID to fetch OAuth credentials
    const userId = c.req.header("x-user-id") ?? newDataSource.userId;
    if (userId) {
      try {
        const boss = await getJobQueueReady();
        const jobData: SyncGoogleSheetsJob = {
          dataSourceId: newDataSource.id,
          userId,
          triggeredBy: "creation",
        };
        await boss.send(SYNC_GOOGLE_SHEETS_JOB, jobData);
      } catch (error) {
        // Log but don't fail creation - sync can be triggered manually later
        console.error(`[createDataSource] Failed to queue initial sync for google-sheets:`, error);
      }
    }
  } else if (newDataSource.type === "api" && config?.apiFetch) {
    // For API sources, queue a sync job to fetch initial data
    try {
      const boss = await getJobQueueReady();
      const jobData: SyncApiDataSourceJob = {
        dataSourceId: newDataSource.id,
        triggeredBy: "creation",
      };
      await boss.send(SYNC_API_DATA_SOURCE_JOB, jobData);
    } catch (error) {
      // Log but don't fail creation - sync can be triggered manually later
      console.error(`[createDataSource] Failed to queue initial sync for api:`, error);
    }
  }

  // New data source has 0 rows (until sync completes)
  const rowCount = 0;
  const status = deriveStatus(rowCount, newDataSource.config);

  return c.json(
    {
      id: newDataSource.id,
      userId: newDataSource.userId,
      teamId: newDataSource.teamId,
      name: newDataSource.name,
      type: newDataSource.type,
      config: newDataSource.config,
      rowCount,
      status,
      createdAt: newDataSource.createdAt.toISOString(),
      updatedAt: newDataSource.updatedAt.toISOString(),
    },
    201
  );
});

dataSourcesApp.openapi(getDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const PREVIEW_LIMIT = 20;

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Verify data source belongs to the team (return 404 to avoid leaking existence)
  if (dataSource.teamId !== teamId) {
    throw createNotFoundError("Data source", id);
  }

  // Check if we have in-memory data first (to determine query strategy)
  const useInMemoryData = hasStoredData(id);

  // Parallelize independent queries for performance
  const [rowCount, mappingsData, dbRows] = await Promise.all([
    computeRowCount(id),
    db.select().from(columnMappings).where(eq(columnMappings.dataSourceId, id)),
    // Only query database rows if we don't have in-memory data
    useInMemoryData
      ? Promise.resolve(null)
      : db
          .select()
          .from(dataRows)
          .where(eq(dataRows.dataSourceId, id))
          .orderBy(asc(dataRows.rowIndex))
          .limit(PREVIEW_LIMIT),
  ]);

  const status = deriveStatus(rowCount, dataSource.config);

  // Transform to simplified format matching frontend expectations
  const columnMappingsResult = mappingsData.map((m) => ({
    sourceColumn: m.sourceColumn,
    normalizedName: m.normalizedName,
    dataType: m.dataType,
  }));

  // Fetch preview data (first 20 rows)
  let previewData: Record<string, unknown>[] = [];
  let columns: string[] = [];

  // Try in-memory store first (for recently uploaded data)
  if (useInMemoryData) {
    try {
      const { rows } = getStoredRows(id, 1, PREVIEW_LIMIT);
      previewData = rows;
      // Extract column names from first row
      if (rows.length > 0) {
        columns = Object.keys(rows[0] as Record<string, unknown>);
      }
    } catch {
      // Fall back to database if in-memory retrieval fails
      const rows = await db
        .select()
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, id))
        .orderBy(asc(dataRows.rowIndex))
        .limit(PREVIEW_LIMIT);

      previewData = rows.map((row) => row.rowData as Record<string, unknown>);
      if (rows.length > 0 && rows[0]?.rowData) {
        columns = Object.keys(rows[0].rowData as Record<string, unknown>);
      }
    }
  } else if (dbRows) {
    // Use already-fetched database rows
    previewData = dbRows.map((row) => row.rowData as Record<string, unknown>);
    // Extract column names from first row
    if (dbRows.length > 0 && dbRows[0]?.rowData) {
      columns = Object.keys(dbRows[0].rowData as Record<string, unknown>);
    }
  }

  return c.json(
    {
      id: dataSource.id,
      userId: dataSource.userId,
      teamId: dataSource.teamId,
      name: dataSource.name,
      type: dataSource.type,
      config: dataSource.config,
      rowCount,
      status,
      createdAt: dataSource.createdAt.toISOString(),
      updatedAt: dataSource.updatedAt.toISOString(),
      columnMappings: columnMappingsResult,
      data: previewData,
      columns,
    },
    200
  );
});

dataSourcesApp.openapi(updateDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  const existing = await verifyDataSourceTeamOwnership(id, teamId);

  // Build update object
  const updates: Partial<{
    name: string;
    type: "csv" | "api" | "manual" | "google-sheets";
    config: Record<string, unknown> | null;
  }> = {};

  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.type !== undefined) {
    updates.type = body.type;
  }
  if (body.config !== undefined) {
    // Merge new config with existing config instead of replacing
    // This preserves fields not included in the update (e.g., spreadsheetId when updating sheetName)
    const existingConfig = (existing.config as Record<string, unknown>) ?? {};
    const newConfig = body.config ?? {};
    updates.config = { ...existingConfig, ...newConfig };
  }

  const [updatedDataSource] = await db
    .update(dataSources)
    .set(updates)
    .where(eq(dataSources.id, id))
    .returning();

  if (!updatedDataSource) {
    throw createNotFoundError("Data source", id);
  }

  const rowCount = await computeRowCount(id);
  const status = deriveStatus(rowCount, updatedDataSource.config);

  return c.json(
    {
      id: updatedDataSource.id,
      userId: updatedDataSource.userId,
      teamId: updatedDataSource.teamId,
      name: updatedDataSource.name,
      type: updatedDataSource.type,
      config: updatedDataSource.config,
      rowCount,
      status,
      createdAt: updatedDataSource.createdAt.toISOString(),
      updatedAt: updatedDataSource.updatedAt.toISOString(),
    },
    200
  );
});

// PATCH handler - reuse the same update logic as PUT
dataSourcesApp.openapi(patchDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  const existing = await verifyDataSourceTeamOwnership(id, teamId);

  // Build update object
  const updates: Partial<{
    name: string;
    type: "csv" | "api" | "manual" | "google-sheets";
    config: Record<string, unknown> | null;
  }> = {};

  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.type !== undefined) {
    updates.type = body.type;
  }
  if (body.config !== undefined) {
    // Merge new config with existing config instead of replacing
    // This preserves fields not included in the update (e.g., spreadsheetId when updating sheetName)
    const existingConfig = (existing.config as Record<string, unknown>) ?? {};
    const newConfig = body.config ?? {};
    updates.config = { ...existingConfig, ...newConfig };
  }

  const [updatedDataSource] = await db
    .update(dataSources)
    .set(updates)
    .where(eq(dataSources.id, id))
    .returning();

  if (!updatedDataSource) {
    throw createNotFoundError("Data source", id);
  }

  const rowCount = await computeRowCount(id);
  const status = deriveStatus(rowCount, updatedDataSource.config);

  return c.json(
    {
      id: updatedDataSource.id,
      userId: updatedDataSource.userId,
      teamId: updatedDataSource.teamId,
      name: updatedDataSource.name,
      type: updatedDataSource.type,
      config: updatedDataSource.config,
      rowCount,
      status,
      createdAt: updatedDataSource.createdAt.toISOString(),
      updatedAt: updatedDataSource.updatedAt.toISOString(),
    },
    200
  );
});

dataSourcesApp.openapi(deleteDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");
  const force = query.force === "true";

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Check if this data source is used as a source for any transforms
  const dependentTransforms = await db
    .select({ id: transforms.id, name: transforms.name })
    .from(transforms)
    .where(eq(transforms.sourceDataSourceId, id));

  if (dependentTransforms.length > 0 && !force) {
    // Return conflict error with transform details
    return c.json(
      {
        error: "Data source is used by transforms",
        code: ErrorCode.CONFLICT,
        details: {
          transformCount: dependentTransforms.length,
          transforms: dependentTransforms.map((t) => ({
            id: t.id,
            name: t.name,
          })),
        },
      },
      409
    );
  }

  // Delete from database (cascade will delete data rows and dependent transforms)
  await db.delete(dataSources).where(eq(dataSources.id, id));

  // Also delete from in-memory store
  deleteStoredData(id);

  return c.body(null, 204);
});

dataSourcesApp.openapi(getDataRowsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Try to get rows from stored data first (uploaded CSV data that hasn't been persisted yet)
  if (hasStoredData(id)) {
    const { rows, total } = getStoredRows(id, page, limit);
    const data = rows.map((row, index) => ({
      id: crypto.randomUUID(),
      dataSourceId: id,
      rowData: row,
      rowIndex: (page - 1) * limit + index,
      createdAt: new Date().toISOString(),
    }));
    return c.json(createPaginatedResponse(data, total, page, limit), 200);
  }

  // Get from database
  const [countResult] = await db
    .select({ count: count() })
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id));
  const total = countResult?.count ?? 0;

  const rows = await db
    .select()
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id))
    .orderBy(asc(dataRows.rowIndex))
    .limit(limit)
    .offset(offset);

  const data = rows.map((row) => ({
    id: row.id,
    dataSourceId: row.dataSourceId,
    rowData: row.rowData,
    rowIndex: row.rowIndex,
    createdAt: row.createdAt.toISOString(),
  }));

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

dataSourcesApp.openapi(previewDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const limit = body.limit ?? 10;

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Try to get preview from stored data first
  if (hasStoredData(id)) {
    const { rows, total } = getStoredRows(id, 1, limit);
    const data = rows.map((row, index) => ({
      id: crypto.randomUUID(),
      dataSourceId: id,
      rowData: row,
      rowIndex: index,
      createdAt: new Date().toISOString(),
    }));
    return c.json({ data, total }, 200);
  }

  // Get from database
  const [countResult] = await db
    .select({ count: count() })
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id));
  const total = countResult?.count ?? 0;

  const rows = await db
    .select()
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id))
    .orderBy(asc(dataRows.rowIndex))
    .limit(limit);

  const data = rows.map((row) => ({
    id: row.id,
    dataSourceId: row.dataSourceId,
    rowData: row.rowData,
    rowIndex: row.rowIndex,
    createdAt: row.createdAt.toISOString(),
  }));

  return c.json({ data, total }, 200);
});

dataSourcesApp.openapi(uploadDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  const dataSource = await verifyDataSourceTeamOwnership(id, teamId);

  // Handle multipart form data upload
  const contentType = c.req.header("content-type") ?? "";

  let fileContent: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw createValidationError("No file provided", {
        field: "file",
        message: "A CSV file must be provided in the 'file' field",
      });
    }

    // Validate file type - require .csv extension OR valid CSV MIME type
    const isValidExtension = file.name.toLowerCase().endsWith(".csv");
    const isValidMimeType =
      file.type === "text/csv" ||
      file.type === "text/plain" ||
      file.type === "application/csv";

    if (!isValidExtension && !isValidMimeType) {
      throw createValidationError("Invalid file type", {
        field: "file",
        message:
          "Only CSV files are accepted. Please upload a file with .csv extension.",
        providedType: file.type,
        providedName: file.name,
      });
    }

    fileContent = await file.text();
  } else if (
    contentType.includes("text/csv") ||
    contentType.includes("text/plain")
  ) {
    // Handle raw CSV content
    fileContent = await c.req.text();
  } else {
    throw createValidationError("Invalid content type", {
      message:
        "Request must be multipart/form-data with a file, or text/csv content",
      providedContentType: contentType,
    });
  }

  if (!fileContent.trim()) {
    throw createValidationError("Empty file", {
      message: "The uploaded file is empty",
    });
  }

  // Get parsing options from config
  const config = dataSource.config as Record<string, unknown> | null;
  const options = {
    hasHeader: (config?.hasHeader as boolean) ?? true,
    delimiter: config?.delimiter as string | undefined,
  };

  try {
    const result = await processUploadedCsv(
      id,
      dataSource.name,
      fileContent,
      options
    );

    // Persist rows to database
    const storedData = getStoredDataSource(id);
    if (storedData && storedData.rows.length > 0) {
      // Delete existing rows first
      await db.delete(dataRows).where(eq(dataRows.dataSourceId, id));

      // Insert new rows in batches
      const batchSize = 100;
      for (let i = 0; i < storedData.rows.length; i += batchSize) {
        const batch = storedData.rows.slice(i, i + batchSize).map((row, index) => ({
          dataSourceId: id,
          rowData: row,
          rowIndex: i + index,
        }));
        await db.insert(dataRows).values(batch);
      }
    }

    return c.json(result, 201);
  } catch (error) {
    if (error instanceof Error) {
      throw createValidationError("CSV processing failed", {
        message: error.message,
      });
    }
    throw error;
  }
});

dataSourcesApp.openapi(previewCsvRoute, async (c) => {
  const body = c.req.valid("json");

  try {
    const result = await getDataPreview(body.content, body.rows);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof Error) {
      throw createValidationError("CSV preview failed", {
        message: error.message,
      });
    }
    throw error;
  }
});

dataSourcesApp.openapi(validateDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Check if we have stored data (in-memory from recent upload)
  if (!hasStoredData(id)) {
    // Try to get from database
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, id))
      .orderBy(asc(dataRows.rowIndex));

    if (rows.length === 0) {
      throw createValidationError("No data to validate", {
        message: "No data has been uploaded for this data source",
        dataSourceId: id,
      });
    }

    // Convert validation rules
    const rules: ValidationRule[] = body.rules.map((rule) => ({
      field: rule.field,
      required: rule.required,
      type: rule.type,
      minLength: rule.minLength,
      maxLength: rule.maxLength,
      pattern: rule.pattern ? new RegExp(rule.pattern) : undefined,
    }));

    const rowData = rows.map((r) => r.rowData as Record<string, unknown>);
    const result = validateData(rowData, rules);
    return c.json(result, 200);
  }

  const storedData = getStoredDataSource(id);
  if (!storedData) {
    throw createNotFoundError("Stored data", id);
  }

  // Convert validation rules
  const rules: ValidationRule[] = body.rules.map((rule) => ({
    field: rule.field,
    required: rule.required,
    type: rule.type,
    minLength: rule.minLength,
    maxLength: rule.maxLength,
    pattern: rule.pattern ? new RegExp(rule.pattern) : undefined,
  }));

  const result = validateData(storedData.rows, rules);
  return c.json(result, 200);
});

dataSourcesApp.openapi(analyzeDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Check if we have stored data
  if (!hasStoredData(id)) {
    throw createValidationError("No data to analyze", {
      message: "No data has been uploaded for this data source",
      dataSourceId: id,
    });
  }

  const storedData = getStoredDataSource(id);
  if (!storedData) {
    throw createNotFoundError("Stored data", id);
  }

  return c.json({ columns: storedData.columns }, 200);
});

// Map core ColumnType to frontend-compatible type
function mapColumnType(
  coreType: string
): "string" | "number" | "boolean" | "date" | "unknown" {
  switch (coreType) {
    case "string":
    case "email":
    case "url":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
      return "date";
    default:
      return "unknown";
  }
}

dataSourcesApp.openapi(getSampleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { limit } = c.req.valid("query");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Try to get sample from in-memory stored data first (recent uploads)
  if (hasStoredData(id)) {
    const { rows, total } = getStoredRows(id, 1, limit);
    return c.json({ data: rows, total }, 200);
  }

  // Fall back to database rows
  const [countResult] = await db
    .select({ count: count() })
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id));
  const total = countResult?.count ?? 0;

  const rows = await db
    .select()
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id))
    .orderBy(asc(dataRows.rowIndex))
    .limit(limit);

  // Extract just the rowData (without wrapper metadata)
  const data = rows.map((row) => row.rowData as Record<string, unknown>);

  return c.json({ data, total }, 200);
});

dataSourcesApp.openapi(getColumnsRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Try to get columns from in-memory stored data first (recent uploads with column analysis)
  if (hasStoredData(id)) {
    const storedData = getStoredDataSource(id);
    if (storedData?.columns) {
      // Return full column info including type and sample values
      const columns = storedData.columns.map((col) => ({
        name: col.suggestedName,
        type: mapColumnType(col.detectedType),
        sampleValues: col.sampleValues,
      }));
      return c.json({ data: columns }, 200);
    }
  }

  // Fall back to extracting columns from database rows
  // Get first few rows to extract sample values
  const sampleRows = await db
    .select()
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, id))
    .orderBy(asc(dataRows.rowIndex))
    .limit(5);

  if (sampleRows.length === 0) {
    // No data available - return empty columns
    return c.json({ data: [] }, 200);
  }

  // Extract columns with type inference and sample values from the rows
  const firstRow = sampleRows[0]!.rowData as Record<string, unknown>;
  const columnNames = Object.keys(firstRow);

  const columns = columnNames.map((name) => {
    // Collect sample values from the sample rows
    const sampleValues: string[] = [];
    for (const row of sampleRows) {
      const rowData = row.rowData as Record<string, unknown>;
      const value = rowData[name];
      if (value != null && sampleValues.length < 3) {
        sampleValues.push(String(value));
      }
    }

    // Infer type from sample values
    let inferredType: "string" | "number" | "boolean" | "date" | "unknown" = "string";
    const firstValue = firstRow[name];
    if (typeof firstValue === "number") {
      inferredType = "number";
    } else if (typeof firstValue === "boolean") {
      inferredType = "boolean";
    }

    return {
      name,
      type: inferredType,
      sampleValues,
    };
  });

  return c.json({ data: columns }, 200);
});

// ============================================================================
// Item CRUD Route Handlers (Phase 0A)
// ============================================================================

/**
 * Scale-aware configuration for bulk operations
 */
const MAX_ROWS = parseInt(process.env.DATA_SOURCE_MAX_ROWS ?? "500000");
const BATCH_SIZE = 100;
const LOG_INTERVAL = 10000; // Log progress every N rows

// POST /api/v1/data-sources/:id/items - Bulk insert items
dataSourcesApp.openapi(bulkInsertItemsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { items, mode } = body;

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Get current row count for append mode validation
  let currentRowCount = 0;
  if (mode === "append") {
    currentRowCount = await computeRowCount(id);
  }

  // Check row limit BEFORE starting insert
  const projectedTotal = mode === "append" ? currentRowCount + items.length : items.length;
  if (projectedTotal > MAX_ROWS) {
    throw createValidationError(`Would exceed row limit of ${MAX_ROWS}`, {
      currentRows: currentRowCount,
      newItems: items.length,
      projectedTotal,
      maxRows: MAX_ROWS,
    });
  }

  // Get starting row index for append mode (before transaction)
  let startingRowIndex = 0;
  if (mode === "append") {
    // Use max() aggregate to get the highest existing row index
    const [maxResult] = await db
      .select({ maxIndex: max(dataRows.rowIndex) })
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, id));

    // If there are existing rows, start after the max index; otherwise start at 0
    startingRowIndex = maxResult?.maxIndex != null ? maxResult.maxIndex + 1 : 0;
  }

  // Perform delete (if replace) and all inserts in a single transaction
  // This ensures atomicity: if any insert fails, the delete is rolled back
  let insertedCount = 0;

  await db.transaction(async (tx) => {
    // If replace mode, delete existing items first (within transaction)
    if (mode === "replace") {
      await tx.delete(dataRows).where(eq(dataRows.dataSourceId, id));
    }

    // Batch insert in chunks of BATCH_SIZE
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchValues = batch.map((item, idx) => ({
        dataSourceId: id,
        rowData: item,
        rowIndex: startingRowIndex + i + idx,
      }));

      await tx.insert(dataRows).values(batchValues);
      insertedCount += batch.length;

      // Log progress for large inserts
      if (insertedCount % LOG_INTERVAL === 0) {
        console.log(`[bulkInsert] Inserted ${insertedCount}/${items.length} rows for dataSourceId=${id}`);
      }
    }
  });

  // Calculate final total (after transaction committed)
  const finalTotal = await computeRowCount(id);
  const limitReached = finalTotal >= MAX_ROWS * 0.9; // Warn when 90% of limit

  return c.json(
    {
      inserted: insertedCount,
      total: finalTotal,
      ...(limitReached && { limitReached: true }),
    },
    201
  );
});

// PUT /api/v1/data-sources/:id/items/:itemId - Update single item
dataSourcesApp.openapi(updateItemRoute, async (c) => {
  const { id, itemId } = c.req.valid("param");
  const body = c.req.valid("json");
  const { data } = body;

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Check if item exists and belongs to this data source
  const [existingItem] = await db
    .select()
    .from(dataRows)
    .where(eq(dataRows.id, itemId))
    .limit(1);

  if (!existingItem) {
    throw createNotFoundError("Item", itemId);
  }

  if (existingItem.dataSourceId !== id) {
    throw createNotFoundError("Item", itemId);
  }

  // Update the item
  const [updatedItem] = await db
    .update(dataRows)
    .set({ rowData: data })
    .where(eq(dataRows.id, itemId))
    .returning();

  if (!updatedItem) {
    throw createNotFoundError("Item", itemId);
  }

  return c.json(
    {
      id: updatedItem.id,
      dataSourceId: updatedItem.dataSourceId,
      rowData: updatedItem.rowData,
      rowIndex: updatedItem.rowIndex,
      createdAt: updatedItem.createdAt.toISOString(),
    },
    200
  );
});

// DELETE /api/v1/data-sources/:id/items/:itemId - Delete single item
dataSourcesApp.openapi(deleteItemRoute, async (c) => {
  const { id, itemId } = c.req.valid("param");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Check if item exists and belongs to this data source
  const [existingItem] = await db
    .select()
    .from(dataRows)
    .where(eq(dataRows.id, itemId))
    .limit(1);

  if (!existingItem) {
    throw createNotFoundError("Item", itemId);
  }

  if (existingItem.dataSourceId !== id) {
    throw createNotFoundError("Item", itemId);
  }

  // Delete the item
  await db.delete(dataRows).where(eq(dataRows.id, itemId));

  return c.body(null, 204);
});

// DELETE /api/v1/data-sources/:id/items - Clear all items
dataSourcesApp.openapi(clearItemsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const _query = c.req.valid("query"); // Validates confirm=true query param

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Get count before deletion
  const deletedCount = await computeRowCount(id);

  // Delete all items
  await db.delete(dataRows).where(eq(dataRows.dataSourceId, id));

  return c.json({ deleted: deletedCount }, 200);
});

// ============================================================================
// API Key Route Handlers (Phase 0B)
// ============================================================================

/**
 * Constants for API key generation.
 */
const API_KEY_PREFIX = "ds_live_";
const API_KEY_BYTES = 32; // 32 bytes = 64 hex chars
const BCRYPT_COST = 10;

/**
 * Generate a secure API key.
 * @returns The plaintext key with prefix
 */
function generateApiKey(): string {
  const keyBytes = randomBytes(API_KEY_BYTES);
  return `${API_KEY_PREFIX}${keyBytes.toString("hex")}`;
}

/**
 * Create a display prefix for the API key.
 * Shows first 8 chars after prefix, then ellipsis.
 * @param key - Full API key
 * @returns Truncated key for display
 */
function createKeyPrefix(key: string): string {
  // Extract the hex part after ds_live_
  const hexPart = key.substring(API_KEY_PREFIX.length);
  return `${API_KEY_PREFIX}${hexPart.substring(0, 8)}...`;
}

// POST /api/v1/data-sources/:id/api-key - Generate API key
dataSourcesApp.openapi(generateApiKeyRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Generate new API key
  const plaintextKey = generateApiKey();
  const keyHash = await bcrypt.hash(plaintextKey, BCRYPT_COST);
  const keyPrefix = createKeyPrefix(plaintextKey);
  const createdAt = new Date().toISOString();

  // Build new config with API key
  const existingConfig = (dataSource.config as DataSourceConfig) ?? {};
  const newConfig: DataSourceConfig = {
    ...existingConfig,
    apiKey: {
      keyHash,
      keyPrefix,
      createdAt,
    },
  };

  // Update the data source config
  await db
    .update(dataSources)
    .set({ config: newConfig })
    .where(eq(dataSources.id, id));

  return c.json(
    {
      key: plaintextKey,
      keyPrefix,
      createdAt,
    },
    201
  );
});

// POST /api/v1/data-sources/:id/api-key/regenerate - Regenerate API key
dataSourcesApp.openapi(regenerateApiKeyRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Generate new API key
  const plaintextKey = generateApiKey();
  const keyHash = await bcrypt.hash(plaintextKey, BCRYPT_COST);
  const keyPrefix = createKeyPrefix(plaintextKey);
  const createdAt = new Date().toISOString();

  // Build new config with API key (replace old key, clear lastUsedAt)
  const existingConfig = (dataSource.config as DataSourceConfig) ?? {};
  const newConfig: DataSourceConfig = {
    ...existingConfig,
    apiKey: {
      keyHash,
      keyPrefix,
      createdAt,
      // Note: lastUsedAt is intentionally NOT included to clear it
    },
  };

  // Update the data source config
  await db
    .update(dataSources)
    .set({ config: newConfig })
    .where(eq(dataSources.id, id));

  return c.json(
    {
      key: plaintextKey,
      keyPrefix,
      createdAt,
      previousKeyRevoked: true as const,
    },
    201
  );
});

// ============================================================================
// API Fetch Route Handlers (Phase 2B)
// ============================================================================

// POST /api/v1/data-sources/test-connection - Test API connection
dataSourcesApp.openapi(testConnectionRoute, async (c) => {
  const body = c.req.valid("json");

  // Convert schema types to service types
  const result = await testApiConnection({
    url: body.url,
    method: body.method,
    headers: body.headers,
    body: body.body,
    flattenConfig: body.flattenConfig
      ? {
          dataPath: body.flattenConfig.dataPath,
          maxDepth: body.flattenConfig.maxDepth,
          arrayHandling: body.flattenConfig.arrayHandling,
          arraySeparator: body.flattenConfig.arraySeparator,
        }
      : undefined,
    authType: body.authType,
    authCredentials: body.authCredentials,
  });

  return c.json(result, 200);
});

// ============================================================================
// Sync Job Route Handlers (Phase 2C)
// ============================================================================

// POST /api/v1/data-sources/:id/sync - Trigger manual sync
dataSourcesApp.openapi(triggerSyncRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  const config = dataSource.config as DataSourceConfig | null;
  const boss = await getJobQueueReady();
  let jobId: string | null = null;

  // Handle sync based on data source type
  switch (dataSource.type) {
    case "api": {
      // Validate it has apiFetch configuration
      if (!config?.apiFetch) {
        throw createValidationError("Missing API configuration", {
          message: "Data source has no API fetch configuration",
        });
      }

      const jobData: SyncApiDataSourceJob = {
        dataSourceId: id,
        triggeredBy: "manual",
      };

      jobId = await boss.send(SYNC_API_DATA_SOURCE_JOB, jobData);
      break;
    }

    case "google-sheets": {
      // Validate it has Google Sheets configuration (spreadsheetId is the key field)
      // Config can be stored as { spreadsheetId, sheetName, ... } directly or nested under googleSheets
      const hasGoogleSheetsConfig = config?.spreadsheetId || config?.googleSheets?.spreadsheetId;
      if (!hasGoogleSheetsConfig) {
        throw createValidationError("Missing Google Sheets configuration", {
          message: "Data source has no Google Sheets configuration (missing spreadsheetId)",
        });
      }

      // Get userId from header or data source
      const userId = c.req.header("x-user-id") ?? dataSource.userId;
      if (!userId) {
        throw createValidationError("Missing user ID", {
          message: "User ID is required to sync Google Sheets. Provide via x-user-id header.",
        });
      }

      const jobData: SyncGoogleSheetsJob = {
        dataSourceId: id,
        userId,
        triggeredBy: "manual",
      };

      jobId = await boss.send(SYNC_GOOGLE_SHEETS_JOB, jobData);
      break;
    }

    case "csv": {
      throw createValidationError("Invalid data source type", {
        message: "CSV data sources cannot be synced. Use the upload endpoint to update data.",
        type: dataSource.type,
      });
    }

    case "manual": {
      throw createValidationError("Invalid data source type", {
        message: "Manual data sources cannot be synced. Use the items endpoint to update data.",
        type: dataSource.type,
      });
    }

    default: {
      throw createValidationError("Invalid data source type", {
        message: `Data source type '${dataSource.type}' does not support sync`,
        type: dataSource.type,
      });
    }
  }

  if (!jobId) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to queue sync job");
  }

  return c.json(
    {
      jobId,
      status: "queued" as const,
    },
    200
  );
});

// ============================================================================
// Column Stats Route Definitions
// ============================================================================

// POST /api/v1/data-sources/:id/compute-stats - Compute column length statistics
const computeStatsRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/compute-stats",
  tags: ["Data Sources"],
  summary: "Compute column length statistics",
  description:
    "Analyzes all rows in a data source to compute min/max/avg character lengths for each column. " +
    "Results are cached in the data source config for use in template validation.",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Column statistics computed successfully",
      content: {
        "application/json": {
          schema: computeStatsResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// POST /api/v1/data-sources/:id/validate-template - Validate template against data
const validateTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/data-sources/{id}/validate-template",
  tags: ["Data Sources"],
  summary: "Validate template against data",
  description:
    "Validates a template string against all rows in a data source. " +
    "Returns details about which rows will exceed platform character limits when the template is expanded.",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: validateTemplateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Template validation results",
      content: {
        "application/json": {
          schema: validateTemplateResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Column Stats Route Handlers
// ============================================================================

// POST /api/v1/data-sources/:id/compute-stats - Compute column length statistics
dataSourcesApp.openapi(computeStatsRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Compute column statistics
  const result = await computeColumnLengthStats(id);

  return c.json(result, 200);
});

// POST /api/v1/data-sources/:id/validate-template - Validate template against data
dataSourcesApp.openapi(validateTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Get team context from middleware
  const { team } = getTeamContext(c);
  const teamId = team.id;

  // Verify data source exists and belongs to team
  await verifyDataSourceTeamOwnership(id, teamId);

  // Validate template against data
  const result = await validateTemplateAgainstData(
    id,
    body.template,
    body.field,
    body.platform
  );

  return c.json(result, 200);
});

// Error handler for API exceptions
dataSourcesApp.onError((err, c) => {
  if (err instanceof ApiException) {
    return c.json(err.toJSON(), err.status);
  }

  console.error("Unexpected error:", err);
  return c.json(
    {
      error: "Internal server error",
      code: ErrorCode.INTERNAL_ERROR,
    },
    500
  );
});

export default dataSourcesApp;
