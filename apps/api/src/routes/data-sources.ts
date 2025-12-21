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
  csvPreviewRequestSchema,
  csvPreviewResponseSchema,
  validateRequestSchema,
  validationResponseSchema,
  analyzeResponseSchema,
} from "../schemas/data-sources.js";
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
import type { ValidationRule } from "@repo/core";

// In-memory mock data store (will be replaced with actual database)
// Export for testing purposes
export const mockDataSources = new Map<
  string,
  z.infer<typeof dataSourceSchema>
>();
export const mockDataRows = new Map<string, z.infer<typeof dataRowSchema>[]>();

// Function to reset and seed mock data
export function seedMockData() {
  mockDataSources.clear();
  mockDataRows.clear();
  clearAllStoredData();

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
  description:
    "Returns paginated data rows for a specific data source. Returns data from uploaded CSV if available, otherwise falls back to mock data.",
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
  deleteStoredData(id);

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

  // Try to get rows from stored data first (uploaded CSV data)
  if (hasStoredData(id)) {
    const { rows, total } = getStoredRows(id, page, limit);
    // Convert to dataRow format
    const data = rows.map((row, index) => ({
      id: crypto.randomUUID(),
      dataSourceId: id,
      rowData: row,
      rowIndex: (page - 1) * limit + index,
      createdAt: new Date().toISOString(),
    }));
    return c.json(createPaginatedResponse(data, total, page, limit), 200);
  }

  // Fallback to mock data
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

  // Fallback to mock data
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

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  // Check if we have stored data
  if (!hasStoredData(id)) {
    throw createValidationError("No data to validate", {
      message: "No data has been uploaded for this data source",
      dataSourceId: id,
    });
  }

  const storedData = getStoredDataSource(id);
  if (!storedData) {
    throw createNotFoundError("Stored data", id);
  }

  // Convert validation rules - handle pattern conversion from string to RegExp
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

  const dataSource = mockDataSources.get(id);
  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

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
