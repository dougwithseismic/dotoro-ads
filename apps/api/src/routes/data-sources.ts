import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
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
} from "../schemas/data-sources.js";
import { idParamSchema, paginationSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";

// In-memory mock data store (will be replaced with actual database)
// Export for testing purposes
export const mockDataSources = new Map<string, z.infer<typeof dataSourceSchema>>();
export const mockDataRows = new Map<string, z.infer<typeof dataRowSchema>[]>();

// Function to reset and seed mock data
export function seedMockData() {
  mockDataSources.clear();
  mockDataRows.clear();

  const seedId = "550e8400-e29b-41d4-a716-446655440000";
  mockDataSources.set(seedId, {
    id: seedId,
    userId: null,
    name: "Test CSV Source",
    type: "csv",
    config: { delimiter: "," },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });
  mockDataRows.set(seedId, [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      dataSourceId: seedId,
      rowData: { product_name: "Test Product 1", price: 99.99 },
      rowIndex: 0,
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      dataSourceId: seedId,
      rowData: { product_name: "Test Product 2", price: 149.99 },
      rowIndex: 1,
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  ]);
}

// Initial seed
seedMockData();

// Create the OpenAPI Hono app
export const dataSourcesApp = new OpenAPIHono();

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
  description: "Returns the details of a specific data source",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Data source details",
      content: {
        "application/json": {
          schema: dataSourceSchema,
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

// DELETE /api/v1/data-sources/:id - Delete a data source
const deleteDataSourceRoute = createRoute({
  method: "delete",
  path: "/api/v1/data-sources/{id}",
  tags: ["Data Sources"],
  summary: "Delete a data source",
  description: "Deletes a data source and all associated data rows",
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Data source deleted successfully",
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
  description: "Returns paginated data rows for a specific data source",
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
  description: "Uploads and processes a CSV file for the data source",
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

// ============================================================================
// Route Handlers
// ============================================================================

dataSourcesApp.openapi(listDataSourcesRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const allSources = Array.from(mockDataSources.values());
  const total = allSources.length;
  const start = (page - 1) * limit;
  const data = allSources.slice(start, start + limit);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

dataSourcesApp.openapi(createDataSourceRoute, async (c) => {
  const body = c.req.valid("json");

  const newDataSource: z.infer<typeof dataSourceSchema> = {
    id: crypto.randomUUID(),
    userId: null,
    name: body.name,
    type: body.type,
    config: body.config ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockDataSources.set(newDataSource.id, newDataSource);
  mockDataRows.set(newDataSource.id, []);

  return c.json(newDataSource, 201);
});

dataSourcesApp.openapi(getDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  return c.json(dataSource, 200);
});

dataSourcesApp.openapi(updateDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  const updatedDataSource: z.infer<typeof dataSourceSchema> = {
    ...dataSource,
    ...(body.name && { name: body.name }),
    ...(body.type && { type: body.type }),
    ...(body.config !== undefined && { config: body.config ?? null }),
    updatedAt: new Date().toISOString(),
  };

  mockDataSources.set(id, updatedDataSource);

  return c.json(updatedDataSource, 200);
});

dataSourcesApp.openapi(deleteDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  mockDataSources.delete(id);
  mockDataRows.delete(id);

  return c.body(null, 204);
});

dataSourcesApp.openapi(getDataRowsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  const rows = mockDataRows.get(id) ?? [];
  const total = rows.length;
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

dataSourcesApp.openapi(previewDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const limit = body.limit ?? 10;

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  const rows = mockDataRows.get(id) ?? [];
  const data = rows.slice(0, limit);

  return c.json({ data, total: rows.length }, 200);
});

dataSourcesApp.openapi(uploadDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Placeholder implementation - actual file upload will be implemented later
  return c.json(
    {
      message: "File upload endpoint - implementation pending",
      rowsProcessed: 0,
      columnMappings: [],
    },
    201
  );
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
