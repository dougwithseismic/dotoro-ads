import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq, count, asc } from "drizzle-orm";
import {
  campaignTemplateSchema,
  createCampaignTemplateSchema,
  updateCampaignTemplateSchema,
  templateListResponseSchema,
  templateQuerySchema,
  templatePreviewRequestSchema,
  templatePreviewResponseSchema,
  previewAdSchema,
  extractVariablesRequestSchema,
  extractVariablesResponseSchema,
  validateTemplateRequestSchema,
  validateTemplateResponseSchema,
  substituteVariablesRequestSchema,
  substituteVariablesResponseSchema,
  previewWithDataRequestSchema,
  previewWithDataResponseSchema,
} from "../schemas/templates.js";
import { idParamSchema } from "../schemas/common.js";
import { commonResponses, createPaginatedResponse } from "../lib/openapi.js";
import { createNotFoundError, ApiException, ErrorCode } from "../lib/errors.js";
import { templateService } from "../services/template-service.js";
import { db, campaignTemplates, dataRows } from "../services/db.js";
import { hasStoredData, getStoredRows } from "../services/data-ingestion.js";

// Create the OpenAPI Hono app
export const templatesApp = new OpenAPIHono();

// ============================================================================
// Route Definitions
// ============================================================================

const listTemplatesRoute = createRoute({
  method: "get",
  path: "/api/v1/templates",
  tags: ["Templates"],
  summary: "List all templates",
  description: "Returns a paginated list of campaign templates",
  request: {
    query: templateQuerySchema,
  },
  responses: {
    200: {
      description: "List of templates",
      content: {
        "application/json": {
          schema: templateListResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const createTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/templates",
  tags: ["Templates"],
  summary: "Create a new template",
  description: "Creates a new campaign template",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createCampaignTemplateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Template created successfully",
      content: {
        "application/json": {
          schema: campaignTemplateSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const getTemplateRoute = createRoute({
  method: "get",
  path: "/api/v1/templates/{id}",
  tags: ["Templates"],
  summary: "Get a template by ID",
  description: "Returns the details of a specific template",
  request: {
    params: idParamSchema,
  },
  responses: {
    200: {
      description: "Template details",
      content: {
        "application/json": {
          schema: campaignTemplateSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const updateTemplateRoute = createRoute({
  method: "put",
  path: "/api/v1/templates/{id}",
  tags: ["Templates"],
  summary: "Update a template",
  description: "Updates an existing template",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCampaignTemplateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Template updated successfully",
      content: {
        "application/json": {
          schema: campaignTemplateSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const deleteTemplateRoute = createRoute({
  method: "delete",
  path: "/api/v1/templates/{id}",
  tags: ["Templates"],
  summary: "Delete a template",
  description: "Deletes a campaign template",
  request: {
    params: idParamSchema,
  },
  responses: {
    204: {
      description: "Template deleted successfully",
    },
    ...commonResponses,
  },
});

const previewTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/{id}/preview",
  tags: ["Templates"],
  summary: "Preview generated ads",
  description: "Returns a preview of ads that would be generated from this template",
  request: {
    params: idParamSchema,
    body: {
      content: {
        "application/json": {
          schema: templatePreviewRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview of generated ads",
      content: {
        "application/json": {
          schema: templatePreviewResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

templatesApp.openapi(listTemplatesRoute, async (c) => {
  const query = c.req.valid("query");
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (query.platform) {
    conditions.push(eq(campaignTemplates.platform, query.platform));
  }

  const whereClause = conditions.length > 0 ? conditions[0] : undefined;

  // Get total count
  const countQuery = db.select({ count: count() }).from(campaignTemplates);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [countResult] = await countQuery;
  const total = countResult?.count ?? 0;

  // Get paginated data
  const selectQuery = db.select().from(campaignTemplates);
  if (whereClause) {
    selectQuery.where(whereClause);
  }
  const templates = await selectQuery
    .limit(limit)
    .offset(offset)
    .orderBy(campaignTemplates.createdAt);

  // Convert to API format
  const data = templates.map((template) => ({
    id: template.id,
    userId: template.userId,
    name: template.name,
    platform: template.platform,
    structure: template.structure,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }));

  return c.json(createPaginatedResponse(data, total, page, limit), 200);
});

templatesApp.openapi(createTemplateRoute, async (c) => {
  const body = c.req.valid("json");

  const [newTemplate] = await db
    .insert(campaignTemplates)
    .values({
      name: body.name,
      platform: body.platform,
      structure: body.structure ?? null,
    })
    .returning();

  if (!newTemplate) {
    throw new ApiException(500, ErrorCode.INTERNAL_ERROR, "Failed to create template");
  }

  return c.json(
    {
      id: newTemplate.id,
      userId: newTemplate.userId,
      name: newTemplate.name,
      platform: newTemplate.platform,
      structure: newTemplate.structure,
      createdAt: newTemplate.createdAt.toISOString(),
      updatedAt: newTemplate.updatedAt.toISOString(),
    },
    201
  );
});

templatesApp.openapi(getTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");

  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, id))
    .limit(1);

  if (!template) {
    throw createNotFoundError("Template", id);
  }

  return c.json(
    {
      id: template.id,
      userId: template.userId,
      name: template.name,
      platform: template.platform,
      structure: template.structure,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    },
    200
  );
});

templatesApp.openapi(updateTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Check if template exists
  const [existing] = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, id))
    .limit(1);

  if (!existing) {
    throw createNotFoundError("Template", id);
  }

  // Build update object
  const updates: Partial<{
    name: string;
    platform: "reddit" | "google" | "facebook";
    structure: Record<string, unknown> | null;
  }> = {};

  if (body.name !== undefined) {
    updates.name = body.name;
  }
  if (body.platform !== undefined) {
    updates.platform = body.platform;
  }
  if (body.structure !== undefined) {
    updates.structure = body.structure ?? null;
  }

  const [updatedTemplate] = await db
    .update(campaignTemplates)
    .set(updates)
    .where(eq(campaignTemplates.id, id))
    .returning();

  if (!updatedTemplate) {
    throw createNotFoundError("Template", id);
  }

  return c.json(
    {
      id: updatedTemplate.id,
      userId: updatedTemplate.userId,
      name: updatedTemplate.name,
      platform: updatedTemplate.platform,
      structure: updatedTemplate.structure,
      createdAt: updatedTemplate.createdAt.toISOString(),
      updatedAt: updatedTemplate.updatedAt.toISOString(),
    },
    200
  );
});

templatesApp.openapi(deleteTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");

  // Check if template exists
  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, id))
    .limit(1);

  if (!template) {
    throw createNotFoundError("Template", id);
  }

  // Delete from database (cascade will delete related records)
  await db.delete(campaignTemplates).where(eq(campaignTemplates.id, id));

  return c.body(null, 204);
});

templatesApp.openapi(previewTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Get template from database
  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, id))
    .limit(1);

  if (!template) {
    throw createNotFoundError("Template", id);
  }

  // Get data rows for preview - first try in-memory, then database
  let previewRows: Record<string, unknown>[] = [];
  let totalRows = 0;

  if (hasStoredData(body.dataSourceId)) {
    const { rows, total } = getStoredRows(body.dataSourceId, 1, body.limit ?? 10);
    previewRows = rows;
    totalRows = total;
  } else {
    // Get from database
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, body.dataSourceId))
      .orderBy(asc(dataRows.rowIndex))
      .limit(body.limit ?? 10);

    const [countResult] = await db
      .select({ count: count() })
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, body.dataSourceId));

    previewRows = rows.map((r) => r.rowData as Record<string, unknown>);
    totalRows = countResult?.count ?? 0;
  }

  // Generate preview ads
  const previewAds: z.infer<typeof previewAdSchema>[] = previewRows.map((row) => ({
    headline: `${template.name} - ${row.product_name ?? "Preview"}`,
    description: row.description as string ?? "Preview description",
    sourceRow: row,
  })).slice(0, body.limit ?? 10);

  return c.json(
    {
      templateId: id,
      dataSourceId: body.dataSourceId,
      previewAds,
      totalRows,
      warnings: [],
    },
    200
  );
});

// ============================================================================
// Variable Engine Routes
// ============================================================================

const extractVariablesRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/variables/extract",
  tags: ["Templates", "Variables"],
  summary: "Extract variables from template",
  description: "Extracts all variable placeholders from a template",
  request: {
    body: {
      content: {
        "application/json": {
          schema: extractVariablesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "List of extracted variables",
      content: {
        "application/json": {
          schema: extractVariablesResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const validateTemplateRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/validate",
  tags: ["Templates", "Validation"],
  summary: "Validate template",
  description: "Validates a template against platform-specific rules with optional sample data",
  request: {
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
      description: "Validation result",
      content: {
        "application/json": {
          schema: validateTemplateResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const substituteVariablesRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/variables/substitute",
  tags: ["Templates", "Variables"],
  summary: "Substitute variables in template",
  description: "Substitutes variables in a template string with provided data",
  request: {
    body: {
      content: {
        "application/json": {
          schema: substituteVariablesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Substitution result with details",
      content: {
        "application/json": {
          schema: substituteVariablesResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

const previewWithDataRoute = createRoute({
  method: "post",
  path: "/api/v1/templates/preview",
  tags: ["Templates", "Preview"],
  summary: "Preview ads with sample data",
  description: "Generates preview ads by substituting variables with provided data rows",
  request: {
    body: {
      content: {
        "application/json": {
          schema: previewWithDataRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Preview of generated ads",
      content: {
        "application/json": {
          schema: previewWithDataResponseSchema,
        },
      },
    },
    ...commonResponses,
  },
});

// Variable Engine Route Handlers

templatesApp.openapi(extractVariablesRoute, async (c) => {
  const body = c.req.valid("json");
  const variables = templateService.extractVariables(body.template);
  return c.json({ variables }, 200);
});

templatesApp.openapi(validateTemplateRoute, async (c) => {
  const body = c.req.valid("json");
  const result = templateService.validateTemplate(
    body.template,
    body.platform,
    body.sampleData
  );
  return c.json(result, 200);
});

templatesApp.openapi(substituteVariablesRoute, async (c) => {
  const body = c.req.valid("json");
  const result = templateService.previewFieldSubstitution(body.template, body.data);
  return c.json(
    {
      text: result.text,
      success: result.success,
      warnings: result.warnings,
      substitutions: result.substitutions,
    },
    200
  );
});

templatesApp.openapi(previewWithDataRoute, async (c) => {
  const body = c.req.valid("json");
  const result = templateService.previewAds(
    body.template,
    body.dataRows,
    body.platform,
    body.limit
  );
  return c.json(result, 200);
});

// Error handler for API exceptions
templatesApp.onError((err, c) => {
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

export default templatesApp;
