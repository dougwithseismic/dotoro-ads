import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, count, asc } from "drizzle-orm";
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
import { db, dataSources, dataRows, transforms } from "../services/db.js";

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

// ============================================================================
// Route Handlers
// ============================================================================

dataSourcesApp.openapi(listDataSourcesRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(dataSources);
  const total = countResult?.count ?? 0;

  // Get paginated data
  const sources = await db
    .select()
    .from(dataSources)
    .limit(limit)
    .offset(offset)
    .orderBy(dataSources.createdAt);

  // Convert to API format
  const data = sources.map((source) => ({
    id: source.id,
    userId: source.userId,
    name: source.name,
    type: source.type,
    config: source.config,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }));

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

dataSourcesApp.openapi(createDataSourceRoute, async (c) => {
  const body = c.req.valid("json");

  const [newDataSource] = await db
    .insert(dataSources)
    .values({
      name: body.name,
      type: body.type,
      config: body.config ?? null,
    })
    .returning();

  if (!newDataSource) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create data source");
  }

  return c.json(
    {
      id: newDataSource.id,
      userId: newDataSource.userId,
      name: newDataSource.name,
      type: newDataSource.type,
      config: newDataSource.config,
      createdAt: newDataSource.createdAt.toISOString(),
      updatedAt: newDataSource.updatedAt.toISOString(),
    },
    201
  );
});

dataSourcesApp.openapi(getDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

  return c.json(
    {
      id: dataSource.id,
      userId: dataSource.userId,
      name: dataSource.name,
      type: dataSource.type,
      config: dataSource.config,
      createdAt: dataSource.createdAt.toISOString(),
      updatedAt: dataSource.updatedAt.toISOString(),
    },
    200
  );
});

dataSourcesApp.openapi(updateDataSourceRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Check if data source exists
  const [existing] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Data source", id);
  }

  // Build update object
  const updates: Partial<{
    name: string;
    type: "csv" | "api" | "manual";
    config: Record<string, unknown> | null;
  }> = {};

  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.type !== undefined) {
    updates.type = body.type;
  }
  if (body.config !== undefined) {
    updates.config = body.config ?? null;
  }

  const [updatedDataSource] = await db
    .update(dataSources)
    .set(updates)
    .where(eq(dataSources.id, id))
    .returning();

  if (!updatedDataSource) {
    throw createNotFoundError("Data source", id);
  }

  return c.json(
    {
      id: updatedDataSource.id,
      userId: updatedDataSource.userId,
      name: updatedDataSource.name,
      type: updatedDataSource.type,
      config: updatedDataSource.config,
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

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

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

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

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

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

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

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

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

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

  if (!dataSource) {
    throw createNotFoundError("Data source", id);
  }

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

  // Check if data source exists
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, id))
    .limit(1);

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
